const { readdir } = require('node:fs/promises')
const { join } = require('node:path')

const path = require('path')
const fs = require('fs')
const child_process = require('child_process')

const LFS_PATH = path.join(__dirname, './LFS')

const walk = async (dir_path) => Promise.all(
    await readdir(dir_path, { withFileTypes: true }).then((entries) => entries.map((entry) => {
        const child_path = join(dir_path, entry.name)
        return entry.isDirectory() ? walk(child_path) : child_path
    }).filter(x => x != undefined)),
)

async function main() {
    // retrieve a list of all large files in the repo
    let lfs_hash_files = (await walk(LFS_PATH)).flat(Infinity)
    let actual_large_files = lfs_hash_files.map(file_path => {
        let file_contents = fs.readFileSync(file_path).toString().split('\n')
        return {
            hash_file_path: file_path,
            file_path: file_contents[0],
            file_hash: file_contents[1]
        }
    })

    // for every large file, look for the __LFS__ folder
    // and use the chunks inside to restore the file
    for(let { file_path, hash_file_path, file_hash } of actual_large_files) {
        // note:
        // here `file_path` is the relative path to where 
        // the large file should be placed.

        // note:
        // if the large file is already there but the content is different
        // (different file hashes), then we always replace with the new one
        // because it happens during a pull/merge.

        let placeholder_filename = `__LFS__${file_path.replaceAll('\\', '__').replaceAll('/', '__')}`
        if(!fs.existsSync(placeholder_filename)) {
            // we pulled, but the __LFS__ folder is missing
            // however if we're here then there was a hashed entry
            // in the .githooks/LFS folder.
            // that means the __LFS__ folder was deleted, so we remove
            // the hashed LFS entry file.
            fs.unlinkSync(hash_file_path)
            child_process.execSync(`git add --force ${hash_file_path}`)
            continue
        }

        // concat all chunks back to the original file
        let all_chunks = []
        let chunk_filepaths = (await walk(placeholder_filename)).flat(Infinity)

        for(let chunk_filepath of chunk_filepaths) {
            const chunk_buffer = fs.readFileSync(chunk_filepath)
            all_chunks.push(chunk_buffer)
        }

        const large_buffer = Buffer.concat(all_chunks)

        // write back the original file
        fs.writeFileSync(file_path, large_buffer)
    }
}

main()
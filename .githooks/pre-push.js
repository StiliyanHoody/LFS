const { readdir } = require('node:fs/promises')
const { join } = require('node:path')

const path = require('path')
const fs = require('fs')
const child_process = require('child_process')

const ROOT_DIRECTORY = path.join(__dirname, '../')
const LFS_PATH = path.join(__dirname, './LFS')

const walk = async (dir_path) => Promise.all(
    await readdir(dir_path, { withFileTypes: true }).then((entries) => entries.map((entry) => {
        const child_path = join(dir_path, entry.name)
        return entry.isDirectory() ? walk(child_path) : child_path
    }).filter(x => x != undefined)),
)

function chunkify(buffer) {
	let i = 0, result = []
	while (i < buffer.length) {
		result.push([buffer.slice(i, i += 10**7), result.length])
	}
	return result
}

async function main() {
    // first of all, add all LFS files to a commit and push them
    // without them this script wouldn't work on a clean repo clone.
    let lfs_hash_files = (await walk(LFS_PATH)).flat(Infinity)
    for(let lfs_file of lfs_hash_files) {
        let relative_lfs = path.relative(ROOT_DIRECTORY, lfs_file)
        child_process.execSync(`git add --force ${relative_lfs}`)
    }
    try {
        child_process.execSync(`git commit --no-verify -m "[LFS_HOOK] adding LFS files"`)
        child_process.execSync(`git push --no-verify --force`)
    }
    catch {
        // error here simply means the files are already
        // added and pushed. We don't have to push them again.
    }

    // now we want to take each large file and chunkify it
    // if it has not been chunkified before.
    // after that we also want to commit it and push it.
    let actual_large_files = lfs_hash_files.map(file_path => {
        let file_contents = fs.readFileSync(file_path).toString().split('\n')
        return {
            hash_file_path: file_path,
            file_path: file_contents[0],
            file_hash: file_contents[1]
        }
    })

    // note:
    // `actual_large_files` here represents an array of
    // the file paths of the large files whitin the current
    // repo. The file paths are relative to the root of 
    // the repository. (aka: `ROOT_DIRECTORY`)

    for(let large_file of actual_large_files) {
        let placeholder_filename = `__LFS__${large_file.replaceAll('\\', '__').replaceAll('/', '__')}`
        if(fs.existsSync(placeholder_filename)) {
            continue
        }
        fs.mkdirSync(placeholder_filename)

        // the large file doesn't exist here
        if(!fs.existsSync(large_file)) {
            continue
        }

        // todo: 
        // optimize this to work wihout reading the file into memory

        const large_buffer = fs.readFileSync(large_file)
        const buffer_chunks = chunkify(large_buffer)

        for(let [chunk, index] of buffer_chunks) {
            const chunk_filepath = path.join(placeholder_filename, `chunk_${index}.bin`)
            fs.writeFileSync(chunk_filepath, chunk)
            
            const relative_chunk_filepath = path.relative(ROOT_DIRECTORY, chunk_filepath)
            child_process.execSync(`git add --force ${relative_chunk_filepath}`)
        }
    }

    try {
        child_process.execSync(`git commit --no-verify -m "[LFS_HOOK] adding chunks."`)
        child_process.execSync(`git push --no-verify --force`)
    }
    catch {
        // error here simply means the files are already
        // added and pushed. We don't have to push them again.
    }
}

main()
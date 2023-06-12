const path = require('path')
const fs = require('fs')
const child_process = require('child_process')

const ROOT_DIRECTORY = path.join(__dirname, '../')
const LFS_PATH = path.join(__dirname, './LFS')

const walk = async (dir_path) => Promise.all(
    await readdir(dir_path, { withFileTypes: true }).then((entries) => entries.map((entry) => {
        if(EXCLUDED_LFS_FILE_DESCRIPTORS.includes(entry.name)) return undefined
        const child_path = join(dir_path, entry.name)
        return entry.isDirectory() ? walk(child_path) : child_path
    }).filter(x => x != undefined)),
)

async function main() {
    // first of all, add all LFS files to a commit and push them
    // without them this script wouldn't work on a clean repo clone.
    let lfs_hash_files = (await walk(LFS_PATH)).flat(Infinity)
    for(let lfs_file of lfs_hash_files) {
        let relative_lfs = path.relative(ROOT_DIRECTORY, lfs_file)
        child_process.execSync(`git add --force ${relative_lfs}`)
    }
    child_process.execSync(`git commit --no-verify -m "[LFS_HOOK] adding LFS files"`)
    child_process.execSync(`git push --no-verify`)


}

main()
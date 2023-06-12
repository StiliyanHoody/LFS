const { readdir } = require('node:fs/promises')
const { join } = require('node:path')

const path = require('path')
const fs = require('fs')
const child_process = require('child_process')

const ROOT_DIRECTORY = path.join(__dirname, '../')

const walk = async (dir_path) => Promise.all(
  await readdir(dir_path, { withFileTypes: true }).then((entries) => entries.map((entry) => {
    const child_path = join(dir_path, entry.name)
    return entry.isDirectory() ? walk(child_path) : child_path
  })),
)

async function get_all_lfs_files() {
    let all_files = (await walk(ROOT_DIRECTORY)).flat(Infinity)
    all_files = all_files.map(filepath => ({
        filepath,
        filesize_mb: fs.statSync(filepath).size / (1024**2)
    }))
    let large_files_filtered = all_files.filter(({ filesize_mb }) => filesize_mb > 90)
    return large_files_filtered.map(({filepath}) => filepath)
}

function add_ignore_line(ignore_line) {
    let gitignore_path = path.join(ROOT_DIRECTORY, '.gitignore')
    let gitignore = fs.readFileSync(gitignore_path).toString()
    let line_already_exists = gitignore.split('\n').map(line => line.trim()).find(line => line == ignore_line.trim())
    if(line_already_exists) return false
    fs.writeFileSync(gitignore_path, gitignore + `\n${ignore_line}\n`)
    return true
}

async function main() {
    let lfs_files = await get_all_lfs_files()

    let should_signal_abort_commit = false

    for(let large_file of lfs_files) {
        let relative_large_file = path.relative(ROOT_DIRECTORY, large_file)
        
        // add the file to git ignore
        if(add_ignore_line(relative_large_file)) {
            should_signal_abort_commit = true

            // we also want to remove it from the
            // commit tree, so when the user retries
            // the gitignore policy is fully enforced
            try {
                child_process.execSync(`git rm --cached ${large_file}`)
                child_process.execSync(`git reset ${large_file}`)
            }
            catch {
                // failure here simply means the file is not
                // inside of the currently active commit
            }
        }
    }

    if(should_signal_abort_commit) {
        // we need to signal a failure
        // otherwise the commit will go through
        console.log('[LFS_HOOK]: Some large files were found and added to git ignore. Please retry.')
        process.exit(1)
    }
}

main()
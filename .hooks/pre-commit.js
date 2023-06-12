const { readdir } = require('node:fs/promises')
const { join } = require('node:path')
const path = require('path')
const fs = require('fs')

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
    if(line_already_exists) return
    fs.writeFileSync(gitignore_path, gitignore + `\n${ignore_line}\n`)
}

async function main() {
    let lfs_files = await get_all_lfs_files()

    for(let large_file of lfs_files) {
        large_file = path.relative(ROOT_DIRECTORY, large_file)
        
        // add the file to git ignore
        add_ignore_line(large_file)
    }

    if(lfs_files.length > 0) {
        // we need to signal a failure
        // otherwise the commit will go through
        process.exit(1)
    }
}

main()
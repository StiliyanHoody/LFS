## How to enable LFS bypassing

In order to bypass LFS policy that github [enforces](https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-git-large-file-storage), 
I've created a set of [githooks](https://git-scm.com/docs/githooks) linked to a some JS
scripts that will smartly handle large files and you'll
still be able to push them to the repository.

To enable this "hack" run the following command:

`git config --local core.hooksPath .githooks/`

## Hooks used to achieve this

1. `pre-commit`: *runs before every commit*<br>
Whenever you commit changes to the repository
this hook will find any new large files and add 
them to .gitignore. It will also conditionally
remove them from the current commit should they
be there. You'll then be prompted to retry your
commit yet again, only this time it should work.
<br>
2. `pre-push`: *runs before every push*<br>
When a push happens it's assumed that the large
files are already gitignorred by the `pre-commit`
hook. What this hook would do is simply transform
every large file into a folder full of chunks.
While the size of that folder remains the same,
the files are now smaller that github's threshold
and they can be uploaded.
<br>
3. `post-merge`: *runs before every merge/pull*<br>
Finally, in order to rescue the large files back
to their original format, this hook runs after you
merge or pull (every pull triggers a merge).
It will check every reported large file from by
`pre-commit` and restore it. <br>
**Note however, when you first clone the repo and 
there's already large files pushed `post-merge` will 
NOT be called by git. You'll have to do `git pull` 
in order for that hook to trigger.**
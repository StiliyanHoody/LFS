## How to enable LFS bypassing

In order to bypass LFS policy that github [enforces](https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-git-large-file-storage), 
I've created a set of [githooks](https://git-scm.com/docs/githooks) linked to a some JS
scripts that will smartly handle large files and you'll
still be able to push them to the repository.

To enable this "hack" run the following command:

`git config --local core.hooksPath .githooks/`

## Hooks used to achieve this

1. `pre-commit`: *runs before every commit*<br><br>
Whenever you commit changes to the repository<br>
this hook will find any new large files and add <br>
them to .gitignore. It will also conditionally<br>
remove them from the current commit should they<br>
be there. You'll then be prompted to retry your<br>
commit yet again, only this time it should work.<br>

2. `pre-push`: *runs before every push*<br>
When a push happens it's assumed that the large<br>
files are already gitignorred by the `pre-commit`<br>
hook. What this hook would do is simply transform<br>
every large file into a folder full of chunks.<br>
While the size of that folder remains the same,<br>
the files are now smaller that github's threshold<br>
and they can be uploaded.

3. `post-merge`: *runs before every merge/pull*<br>
Finally, in order to rescue the large files back<br>
to their original format, this hook runs after you<br>
merge or pull (every pull triggers a merge).<br>
It will check every reported large file from by<br>
`pre-commit` and restore it. <br><br>
**Note however, when you first clone the repo and <br>
there's already large files pushed `post-merge` will <br>
NOT be called by git. You'll have to do `git pull` <br>
in order for that hook to trigger.**<br>

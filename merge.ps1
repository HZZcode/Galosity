git checkout main
git merge $($args[0])
git add .
git commit -m "$($args[1])"
git push
git branch -d $($args[0])
git push origin -d $($args[0])
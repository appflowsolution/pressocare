@echo off
echo Deploying PressoCare to Firebase Hosting...
firebase deploy --only hosting --project pressocare-15b7d
echo.
echo Deploy complete!
pause

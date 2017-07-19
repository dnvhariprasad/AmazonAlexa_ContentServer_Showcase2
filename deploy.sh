#!/bin/sh

FUNCTION=myContentServer04

echo "🗂 Create Lambda.zip"
zip -r Lambda.zip .

echo "⬆️ Upload Lambda.zip to AWS Lambda";
~/bin/aws lambda update-function-code --function-name $FUNCTION --zip-file fileb://Lambda.zip

echo "🗑 Remove Lambda.zip"
rm Lambda.zip

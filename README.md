# AmazonAlexa_ContentServer_Showcase2

Implementation of integration options to use Alexa / AI for information discovery with OpenText ContentServer as the backend. 

The purpose is to inspire discussions around AI and Information Management / Discovery + learn today's AI / Cloud Computing / Information Discovery.

Preparation:

Install alexa-sdk: npm install --save alexa-sdk
Install request (simple HTTP POST/GET requests) npm install --save request
Install moment for Alexa friendly date formating and calculation npm install moment --save
Furthermore install nodemailer, querystring, util, http, xml2js

For testing, I recommend installing alexa-skill-test (https://github.com/voiyse/alexa-skill-test) npm install -g alexa-skill-test

I'm using the aws cli to upload the zipped code to AWS Lambda. Get a public/private key, the aws cli tool and automate the process.

[![Amazon Alexa and OpenText Content Server](http://i.imgur.com/ZQZFtul.jpg)](https://youtu.be/bs_OAtzF444 "Artificial Intelligent assisted Information Discovery - OpenText and Amazon Alexa")

The code has the follwing issues at this stage:
- Configuration (mailgun, CS16 base URL etc.) is inside index.js. This needs to be configured using external options
- Because of node.js callback hell, error processing is challenging at best. New ways to trap error in asyc execution needs to be explored
- General code cleanup

Feature suggestions:
- Signup Alexa App card: register as user and maintain credentials and parameters in external system
- Workflow integration (status, exceptions - What do I need to know?, invocation):
    ... to have a conversation with CS in the following way:
    -> Please invoke workflow  
    <- I have found 3 workflows for you: Travel Request, Document Approval, Get me a coffee; which one do you want?  
    -> Travel Request please  
    <- OK, What is your departure date?  
    -> (Date 1)  
    <- When are you returning?  
    -> (Date 2)  
    <- And what is the destination?  
    -> Bangkok  
    <- Can you give me a travel reason?  
    -> I have never been there.  
    <- Ok, I have all the required information; do you want me to give you a summary before we send it on it’s way?  
    -> No thanks, please send.  
    <- Ok, done. You will get a notification when processed  
    
- Integration simple interaction options with a suitable OpenText Process Suite BPM (process), showing end-user (Alexa) interaction and Case Management (case worker) dashboard / service delivery example.  

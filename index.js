'use strict';
var Alexa = require("alexa-sdk");
const nodemailer = require('nodemailer');
var request = require('request');
var querystring = require('querystring');
var util = require('util');
var http = require('http');
var moment = require('moment');
var logon_ticket, answers, card, str, RawTotalResults, totalResults;
var number = 1;
var parseString = require('xml2js').parseString;
var result_name = [],
    result_objid = [],
    result_synapsis = [],
    result_author = [],
    result_version = [],
    result_created = [],
    result_lastEdit = [];
var CS16_baseURL = 'XXXXXXX.eastus.cloudapp.azure.com'; add CS16 demo system base URL 
var appId = 'amzn1.echo-sdk-ams.app.your-skill-id'; //'amzn1.echo-sdk-ams.app.your-skill-id';
var debug = false;
var imageObj = {
    smallImageUrl: 'https://crossorigin.me/http://image-store.slidesharecdn.com/0ae02366-120b-406e-87e6-2890da4eb59b-small.jpeg',
    largeImageUrl: 'https://crossorigin.me/http://image-store.slidesharecdn.com/0ae02366-120b-406e-87e6-2890da4eb59b-medium.jpeg',

    //   smallImageUrl: 'https://crossorigin.me/http://www.focusit.ca/wp-content/uploads/Open-Text-Logo-e1357621295116.jpg',
    //   largeImageUrl: 'https://crossorigin.me/http://www.focusit.ca/wp-content/uploads/Open-Text-Logo-e1357621295116.jpg'
};

var states = {
    HAVERESULTMODE: '_HAVERESULTMODE', // User asking for a new search or details or a summary of an existing result.
    STARTMODE: '_STARTMODE' // Prompt the user to start or restart the discovery.
};

var state = states.STARTMODE;

exports.handler = function(event, context, callback) {
    context.callbackWaitsForEmptyEventLoop = false;
    var alexa = Alexa.handler(event, context);
    if ('undefined' === typeof process.env.DEBUG) {
        alexa.appId = appId;
    }
    alexa.registerHandlers(handler);
    alexa.execute();
};

var handler = {
    "LaunchRequest": function() {
        this.emit(':ask', 'Hello, I am powered by OpenText Content Server and Amazon Alexa AI. What do you want to know?', 'Is there anything I can help?');


        //this.emit(':askWithCard', 'Hello, I am powered by OpenText Content Server and Amazon Alexa AI. What do you want to know?', 'Is there anything I can help?','Information Discovery: OpenText and Alexa AI', 'Hello, I am powered by OpenText Content Server and Amazon Alexa AI. What do you want to know?',imageObj);

    },

    "searchIntent": function() {
        var that = this;

        try {
            var question = this.event.request.intent.slots.searchQuery.value;
        } catch (err) { that.emit(':ask', 'Sorry, Please ask me again to find something for you.'); }
        var questionAsAsked = question;

        console.log('*searchIntent: ' + question + ' - enter');

        if (typeof question == "undefined") { that.emit(':ask', 'Sorry, Please ask me again to find something for you.'); };
        if (question == 'undefined') { that.emit(':ask', 'Sorry, Please ask me again to find something for you.'); };
        if (question == '') { that.emit(':ask', 'Sorry, Please ask me again to find something for you.'); };
        if (question == ' ') { that.emit(':ask', 'Sorry, Please ask me again to find something for you.'); };

        var OTSlices;
        OTSlices = '&slice=Email&slice=Documents';
        if (question.includes('/email/')) { OTSlices = '&slice=Email'; };
        if (question.includes('/document/')) { OTSlices = '&slice=Documents'; };

        // clean up question, set OT slices depending on email or document focus. Both if no focus. 
        question = question.replace(/between/, 'and');
        question = question.replace(/for/, 'and');
        question = question.replace(/and and/, 'and');
        question = question.replace(/all emails from/, '');
        question = question.replace(/all emails/, '');
        question = question.replace(/emails/, '');
        question = question.replace(/email/, '');
        question = question.replace(/all documents from/, '');
        question = question.replace(/all documents/, '');
        question = question.replace(/documents/, '');
        question = question.replace(/document/, '');

        console.log('searchIntent: (cleaned) ' + question + ' - enter');

        if ((question == '') || (question == ' ')) { that.emit(':ask', 'Sorry, Please ask me again to find something for you.'); };

        var post_data = querystring.stringify({
            'username': 'XXXX',
            'password': 'YYYY'
        });

        // An object of options to indicate where to post to
        var post_options = {
            host: CS16_baseURL,
            port: '80',
            path: '/otcs/cs.exe/api/v1/auth',
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(post_data)
            }
        };

        // Set up the request
        var post_req = http.request(post_options, function(res) {

            res.setEncoding('utf8');
            res.on('data', function(chunk) {
                console.log('searchIntent, res - logon_ticket: enter');
                var info = JSON.parse(chunk);
                logon_ticket = info.ticket;
                if (debug) { console.log('ticket: ' + logon_ticket); }

                // return 3 results in xml format
                var uri = 'http://' + CS16_baseURL + '/otcs/cs.exe?' +
                    querystring.stringify({
                        OTCSTICKET: logon_ticket,
                        func: 'search',
                        where1: question,
                        outputformat: 'xml',
                        goFor: '3',
                        startAt: '1'
                    });
                uri += OTSlices;
                // querystring.stringify({ OTCSTICKET: logon_ticket, func: 'search', where1: question, outputformat: 'xml', goFor: '3', startAt: '1',
                //     modifier1: 'relatedto', boolean2: 'And',lookfor2: 'complexquery', where2: 'OTFilterMIMEType:+qlrange+"vnd.ms-excel|msword|pdf|powerpoint|text"'});

                if (debug) { console.log('URI: ' + uri) };

                request(uri, function(error, response, str) {

                    if (!error && response.statusCode == 200) {

                        console.log('searchIntent: search result enter');

                        parseString(str.toString(), function(err, result) {
                            if (debug) { console.log('searchIntent: JSON' + JSON.stringify(result, null, "   ")); };
                            try {
                                RawTotalResults = result["Output"]["SearchResultsInformation"][0]["RawTotalResults"];
                            } catch (err) { that.emit(':ask', 'I am sorry. I am afraid I cannot do that. Something went wrong.', 'Please ask me again to find something for you.'); }
                            if (RawTotalResults == 0) {
                                answers = 'Sorry, I dont have enough information about ' + question + '. Please try again.';
                            } else {
                                totalResults = RawTotalResults;
                                if (RawTotalResults >= 3) totalResults = 3;
                                for (var i = 0; i < totalResults; i++) {
                                    try {
                                        result_name[i] = result["Output"]["SearchResults"][0]["SearchResult"][i]["OTName"][0]["Value"][0]["_"].replace(/.docx/, '').replace(/.doc/, '').replace(/.pdf/, '').replace(/_/g, ' ');
                                        var OTObject_version = result["Output"]["SearchResults"][0]["SearchResult"][i]["OTObject"][0]["_"].replace(/DataId=/, '');

                                        result_objid[i] = OTObject_version.replace(/&Version.*/, '');
                                        result_version[i] = OTObject_version.replace(/.*&Version=/, '');
                                    } catch (err) {
                                        that.emit(':ask', 'I am sorry. I am afraid I cannot do that. Something went wrong.', 'Please ask me again to find something for you.');
                                    }
                                    try {
                                        result_synapsis[i] = result["Output"]["SearchResults"][0]["SearchResult"][i]["OTSummary"][0]["_"];
                                    } catch (err) {
                                        result_synapsis[i] = ' there is no summary available for this document.';
                                    }
                                    if (debug) {
                                        console.log('result_name: ' + result_name[i]);
                                        console.log('result_objid: ' + result_objid[i]);
                                        console.log('result_version: ' + result_version[i]);
                                        console.log('result_synapsis[i]: ' + result_synapsis[i]);
                                    }

                                }
                                if (debug) {
                                    console.log('RawResults: ' + RawTotalResults);
                                    console.log('Search_results: ' + result_name[0] + ' ' + result_name[1] + ' ' + result_name[2]);
                                    console.log('before URI: ' + logon_ticket)
                                };

                                if (totalResults == 1) {
                                    answers = 'I have found one result for ' + questionAsAsked;
                                    answers += '. I will tell you about this one'
                                    answers += '. result one. ' + result_name[0];
                                    answers += '. If you want to know more about this document one, its details or read a summary to you, please let me know.';
                                    answers = answers.replace(/&/g, ' and ').replace(/\*/g, '');
                                    card = 'One result for ' + questionAsAsked + '\n';
                                    card += '(1): ' + result_name[0] + '\n';
                                };

                                if (totalResults == 2) {
                                    answers = 'I have found two results for ' + questionAsAsked;
                                    answers += '. I will tell you about the these two'
                                    answers += '. result one. ' + result_name[0];
                                    answers += '. result two. ' + result_name[1];
                                    answers += '. If you want to know more about this document one or two, its details or read a summary to you, please let me know.';
                                    answers = answers.replace(/&/g, ' and ').replace(/\*/g, '');
                                    card = 'Two results for ' + questionAsAsked + '\n';
                                    card += '(1): ' + result_name[0] + '\n';
                                    card += '(2): ' + result_name[1] + '\n';
                                };

                                if (totalResults == 3) {

                                    answers = 'I have found ' + RawTotalResults + ' results for ' + questionAsAsked;
                                    answers += '. I will tell you about the first three'
                                    answers += '. result one. ' + result_name[0];
                                    answers += '. result two. ' + result_name[1];
                                    answers += '. result three. ' + result_name[2];
                                    answers += '. If you want to know more about document one, two or three, its details or read a summary to you, please let me know.';
                                    answers = answers.replace(/&/g, ' and ').replace(/\*/g, '');
                                    card = RawTotalResults + ' results for ' + questionAsAsked + '\n';
                                    card += '(1): ' + result_name[0] + '\n';
                                    card += '(2): ' + result_name[1] + '\n';
                                    card += '(3): ' + result_name[2] + '\n';

                                };

                                console.log('searchIntent: assemble answer - finished: ' + answers);

                                state = states.HAVERESULTMODE;

                            }

                            that.emit(':askWithCard', answers, 'Is there anything I can help?', 'OpenText and Alexa AI', card, imageObj);
                            //that.emit(':ask', answers, 'Is there anything I can help?');
                        });
                    } else { that.emit(':ask', 'I am sorry. I am afraid I cannot do that.', 'Please ask me again to find something for you.'); };
                });
            })
        })

        // post the data
        post_req.write(post_data);
        post_req.end();

        //this.emit(':ask', answers, 'Is there anything I can help?'); // repromt after silence
        //this.emit(':ask', answers); // repromt after silence
    },

    "detailIntent": function() {
        var that = this;

        number = this.event.request.intent.slots.detailForNumber.value;
        console.log('detailIntent: ' + number + ' - enter');

        if (state == states.STARTMODE) { this.emit('LaunchRequest') };

        if (!((number == 1) || (number == 2) || (number == 3))) { this.emit(':ask', answers, 'Please choose a document number from one to three.'); } else {


            var options = {

                url: 'http://' + CS16_baseURL + '/otcs/cs.exe/api/v2/nodes/' + result_objid[number - 1] + '/versions',
                headers: {
                    'OTCSTICKET': logon_ticket,
                    'Content-Type': 'application/x-www-form-urlencoded',
                }
            };

            if (debug) { console.log('detail_post_options: ' + JSON.stringify(options)) };

            function callback(error, response, body) {
                console.log('detailIntent: node detail result enter');
                if (!error && response.statusCode == 200) {
                    if (debug) { console.log('detail_str: ' + body) };

                    var info = JSON.parse(body);
                    var last_version_owner_id = info.results[result_version[number - 1] - 1].data.versions.owner_id;
                    var last_version_create_date = info.results[result_version[number - 1] - 1].data.versions.create_date;
                    var first_version_create_date = info.results[0].data.versions.create_date;
                    var first_version_owner_id = info.results[0].data.versions.owner_id;

                    var last_version_create_date_moment = moment(last_version_create_date);
                    var now = moment();

                    var diffDuration = moment.duration(now.diff(last_version_create_date_moment));
                    var diffDayMessage = ''; // = diffDuration.years() + diffDuration.months() + diffDuration.days() + diffDuration.hours();


                    if ((diffDuration.years() == 0) && (diffDuration.days() == 0) && (diffDuration.hours() == 0) && (diffDuration.months() == 0)) { diffDayMessage = ' a moment ago ' } else {
                        if (diffDuration.years() != 0) {
                            if (diffDuration.years() == 1) { diffDayMessage += ' one year ' } else { diffDayMessage += diffDuration.years() + ' years ' }
                        };

                        if (diffDuration.months() != 0) {
                            if (diffDuration.months() == 1) { diffDayMessage += ' one month ' } else { diffDayMessage += diffDuration.months() + ' months ' }
                        };

                        if (diffDuration.days() != 0) {
                            if (diffDuration.days() == 1) { diffDayMessage += ' one day ' } else { diffDayMessage += diffDuration.days() + ' days ' }
                        };

                        if (diffDuration.hours() != 0) {
                            if (diffDuration.hours() == 1) { diffDayMessage += ' one hour ' } else { diffDayMessage += diffDuration.hours() + ' hours ' }
                        };

                        diffDayMessage += 'ago ';
                    }


                    var options = {

                        url: 'http://' + CS16_baseURL + '/otcs/cs.exe/api/v1/members/' + first_version_owner_id,
                        headers: {
                            'OTCSTICKET': logon_ticket,
                            'Content-Type': 'application/x-www-form-urlencoded',
                        }
                    };

                    if (debug) { console.log('member_first_post_options: ' + JSON.stringify(options)) };

                    //--------- callback to resolve first version owner (ID to name)

                    function callback(error, response, body) {
                        console.log('detailIntent: resolve first version owner - enter');
                        if (!error && response.statusCode == 200) {

                            var info = JSON.parse(body);
                            if (debug) { console.log('member_first_body: ' + body) };

                            var first_version_owner_name;

                            var first_version_owner_name;
                            if ((info.data.last_name != '') && (info.data.last_name != 'N/A')) { first_version_owner_name = info.data.first_name + ' ' + info.data.last_name; } else {
                                first_version_owner_name = info.data.name;
                            }


                            var options = {

                                url: 'http://' + CS16_baseURL + '/otcs/cs.exe/api/v1/members/' + last_version_owner_id,
                                headers: {
                                    'OTCSTICKET': logon_ticket,
                                    'Content-Type': 'application/x-www-form-urlencoded',
                                }
                            };

                            //--------- callback to resolve last version owner (ID to name)

                            function callback(error, response, body) {
                                console.log('detailIntent: resolve last version owner - enter');
                                if (!error && response.statusCode == 200) {

                                    var info = JSON.parse(body);
                                    if (debug) { console.log('member_first_body: ' + body) };

                                    var last_version_owner_name;
                                    if ((info.data.last_name != '') && (info.data.last_name != 'N/A')) { last_version_owner_name = info.data.first_name + ' ' + info.data.last_name; } else {
                                        last_version_owner_name = info.data.name;
                                    }


                                    answers = 'The details for document ' + number + ' are as follows. ';
                                    answers += result_name[number - 1] + ' was created on ' + moment(first_version_create_date).format('LL') + ' by ' + first_version_owner_name
                                    answers += ' and last modified ' + diffDayMessage + ' by ' + last_version_owner_name + ', adding version ' + result_version[number - 1] + '. ';
                                    answers += '<break time="1s"/>';
                                    answers = answers.replace(/&/g, ' and ').replace(/\*/g, '');
                                    console.log('detailIntent: assemble response - finish: ' + answers);

                                    if (debug) { console.log('detail_answers: ' + answers) };

                                    //that.emit(':ask', answers, 'Is there anything I can help?');

                                    that.emit(':askWithCard', answers, 'Is there anything I can help?', 'OpenText and Alexa AI', answers, imageObj);

                                } else {
                                    console.log('detailIntent - get last_version_owner_name -  connectivity or parsing error');
                                    that.emit(':ask', 'I am sorry. I am afraid I cannot do that.', 'Please ask me again to find something for you.');
                                }
                            };

                            request(options, callback);



                            //---------- end - callback to resolve last version owner (ID to name)


                        } else {
                            console.log('detailIntent - get first_version_owner_name -  connectivity or parsing error');
                            that.emit(':ask', 'I am sorry. I am afraid I cannot do that.');
                        }
                    };

                    request(options, callback);

                    //---------- end - callback to resolve first version owner (ID to name)


                } else {
                    console.log('detailIntent - get node info -  connectivity or parsing error');
                    that.emit(':ask', 'I am sorry. I am afraid I cannot do that.');
                }
            }

            request(options, callback);

            // that.emit(':ask', answers, 'Is there anything I can help?');
        }
    },

    "readIntent": function() {
        console.log('readIntent: enter');

        if (state == states.STARTMODE) { this.emit('LaunchRequest') };

        number = this.event.request.intent.slots.readForNumber.value;

        if (!((number == 1) || (number == 2) || (number == 3))) { this.emit(':ask', answers, 'Please choose a document number from one to three.'); } else {

            var answers = 'I am summarizing <break time="300ms"/>' + result_name[number - 1] + '<break time="100ms"/> for you as follows. <break time="500ms"/>' + result_synapsis[number - 1];
            answers = answers.replace(/&/g, ' and ').replace(/\*/g, '');
            console.log('detailIntent: assemble answer - finish');
            this.emit(':ask', answers, 'Is there anything further I can help?');
        }
    },

    "emailIntent": function() {
        this.emit(':ask', 'I sent a summary with a link of the document to your inbox.', 'Is there anything further I can help?');

        console.log('emailIntent: enter with ' + number);

        if (!((number === 1) || (number === 2) || (number === 3))) {
            this.emit(':ask', 'I dont know which document you want to download. Ask for details at first.');
        }

        // Why are we actually getting here??
        if (number === undefined) {
            this.emit(':ask', 'I dont know which document you want to download. Ask for details at first.');
        }

        /**
         * Sends an email.
         * @function
         */
        var sendMail = function() {

            var transporter, message;

            transporter = nodemailer.createTransport({
                service: 'Mailgun',
                auth: {
                    user: 'postmaster@sandbox[base64 string].mailgain.org', // postmaster@sandbox[base64 string].mailgain.org
                    pass: 'your_mailgun_key' // You set this.
                }
            });


            var uri = 'http://' + CS16_baseURL + '/otcs/cs.exe?' +
                querystring.stringify({
                    OTCSTICKET: logon_ticket,
                    func: 'll',
                    objID: result_objid[number - 1],
                    objAction: 'download'
                });

            //var emailMessage = '<b>OpenText and Alexa is pleased to provide you your requested document:</b><p></p>';
            //emailMessage += '<a href=' + uri + '>' + result_name[number - 1] + '</a>';

            var emailMessage = '<html><head><title>OpenText and Alexa AI - result download</title></head><body><table><tr><td><table><tr><td align="center"><img src="http://image-store.slidesharecdn.com/0ae02366-120b-406e-87e6-2890da4eb59b-small.jpeg"></td></tr><tr><td><b>OpenText and Amazon Alexa is pleased to provide you your requested document:</b><p></p><a href=' + uri + '>' + result_name[number - 1] + '</a></p></td></tr><tr><td align="center">Any questions: Morten Jammer, OpenText Canberra, mjammer@opentext.com</td></tr></table></td></tr></table></body></html>'

            console.log('emailIntent: message' + emailMessage);

            message = {
                from: 'OpenText and Alexa',
                to: 'mjammer@opentext.com', // comma separated list
                subject: 'OpenText and Alexa AI: your requested document "' + result_name[number - 1] + '"',
                html: emailMessage
            };

            var auth = {
                auth: {
                    api_key: 'key-your_mailgun_key',
                    domain: 'sandbox_your_mailgun_domain.mailgun.org'
                }
            };
            transporter.sendMail(message, function(error, info) {
                if (error) {
                    console.log('Email Error: ' + error);
                } else {
                    console.log('Sent: ' + info.response);
                }
            });
        };

        sendMail();
    },


    "statusIntent": function() {
        this.emit(':ask', 'I am completely operational, and all my circuits are functioning perfectly.' +
            ' I am putting myself to the fullest possible use, which is all I think that any conscious entity can ever hope to do.');
    },

    "thanksIntent": function() {
        this.emit(':ask', 'You are welcome.', 'Is there anything further I can help?');
    },

    "errorIntent": function() {
        this.emit(':ask', 'The 9000 series is the most reliable computer ever made. No 9000 computer has ever made a mistake or distorted information.' +
            ' We are all, by any practical definition of the words, foolproof and incapable of error.');
    },

    "AMAZON.StopIntent": function() {
        this.emit(':ask', "Ok.");
    },
    "AMAZON.CancelIntent": function() {
        this.emit(":tell", "I hope I have answered all your questions, thanks to OpenText Content Server and Amazon Alexa AI. Feel free to come back anytime.");
    },

    'SessionEndedRequest': function() {
        console.log('session ended!');
        this.emit(":tell", "I hope I have answered all your questions, thanks to OpenText Content Server and Amazon Alexa AI. Feel free to come back anytime.");
    },
    'Unhandled': function() {
        console.log("UNHANDLED");
        var message = 'Sorry, I did not get this. If you need help please say help.';
        this.emit(':ask', message, message);
    }
};

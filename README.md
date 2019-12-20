# Vancouver Bus Tracker
Use voice commands to interact with real-time bus data in Vancouver, Canada. To test it out try out these phrases
> Alexa, ask bus tracker when the next 2 is coming

## Setup
1. Install and configure the latest version of [ASK-CLI](https://developer.amazon.com/en-GB/docs/alexa/smapi/quick-start-alexa-skills-kit-command-line-interface.html)

	```bash
	npm update -g ask-cli
	```

2. **Clone** the repository.

	```bash
	ask new --url https://github.com/tmccann21/bus-tracker.git --skill-name van-bus-tracker
	```

3. ASK CLI **will create the skill and the lambda function for you**. The Lambda function will be created in ```us-east-1 (Northern Virginia)``` by default.
Navigate to the project's root directory. you should see a file named 'skill.json' there. Deploy the skill and the lambda function in one step by running the following command:

	```bash
	ask deploy
	```
2. Configure the following environment variables:

	```bash
	TRANSLINK_API_KEY=""
	```

5. Now you should be able to enable the skill under `Dev` from the Alexa app. For more helpful tips check out [this guide](https://github.com/alexa/skill-sample-nodejs-howto/blob/master/instructions/cli.md) by Amazon.
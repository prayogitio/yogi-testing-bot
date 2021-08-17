const { createAppAuth } = require("@octokit/auth-app");
const { ProbotOctokit } = require("probot");
var discordClient = require("../helper/discord-client");
var config = require("../helper/config");

var test_repositories = ["testing"];
var repositories = [
	"kaskus-forum",
	"kaskus-forum-wap",
	"kaskus-core-forum",
	"kaskus-core",
	"kaskus-api",
	"kaskus-fjb",
	"kaskus-fjb-wap"
];

exports.exec = async (app) => {
	const auth = createAppAuth({
		appId: app.state.appId,
		privateKey: app.state.privateKey,
		clientId: process.env.CLIENT_ID,
		clientSecret: process.env.WEBHOOK_SECRET,
	});
	const appAuthentication = await auth({ type: "app" });
	const octokit = new ProbotOctokit({ auth: "token " + appAuthentication.token });

	for (let index = 0; index < test_repositories.length; index++) {
		const repository = test_repositories[index];
		let reminderMessage = `[${repository}]\n`;
		try {
			let pullRequests = await octokit.rest.pulls.list({
				owner: config.REPOSITORY_OWNER_TESTING,
				repo: repository,
				state: "open"
			});
			let item = "";
			for (let indexx = 0; indexx < pullRequests.data.length; indexx++) {
				const pullRequest = pullRequests.data[indexx];
				item += "- " + pullRequest.title; item += " (";
				item += pullRequest.html_url; item += ") ";
				item += "by " + pullRequest.user.login + ". ";
				item += "Requested reviewers: " + getRequestedReviewers(pullRequest.requested_reviewers) + ".\n";
			}
			reminderMessage += item;
		} catch (error) {
			app.log.error(error);
		}
		discordClient.sendReminderMessage(reminderMessage);
		app.log.info(`Review Reminder message for repository ${repository} has been sent.`);
	}
};

function getRequestedReviewers(requestedReviewers) {
	let reviewers = "";
	for (let index = 0; index < requestedReviewers.length; index++) {
		if (index > 0) reviewers += ", ";
		const reviewer = requestedReviewers[index];
		reviewers += reviewer.login;
	}
	return reviewers == "" ? "No reviewers" : reviewers;
}

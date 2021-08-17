const schedule = require('node-schedule');
const reviewReminder = require("./job/review_reminder.js");
var requester = require("./helper/requester");
var config = require("./helper/config");
var util = require("./helper/util");

/**
 * This is the main entrypoint to your Probot app
 * @param {import('probot').Probot} app
 */
module.exports = (app) => {

	app.log.info("Yay, the app was loaded!");
	app.on("pull_request.closed", async (context) => {

		const payload = context.payload;
		const pullRequest = payload.pull_request;
		const headBranch = pullRequest.head.ref;
		const pullRequestBody = pullRequest.body;

		if (util.isFeatureMergedToDevelopment(context)) {
			await autoCreateReleasePullRequest(app, context);
		} else if (util.isRelMergedToMaster(context)) {
			let isMergebackPullRequestOpened = await requester.openPullRequestFromRelToDevelopment(app, context, headBranch, pullRequestBody);
			if (!isMergebackPullRequestOpened) {
				await requester.createComment(app, context, pullRequest, `Mergeback not needed, this branch ${headBranch} will be deleted.`);
				await requester.deleteBranch(app, context, "heads/" + headBranch);
			}
		} else if (util.isRelMergedToDevelopment(context)) {
			await requester.createComment(app, context, pullRequest, `This branch ${headBranch} will be deleted.`);
			await requester.deleteBranch(app, context, "heads/" + headBranch);
		}
	});

	registerReviewReminderJob(app);
}

function registerReviewReminderJob(app) {
	const rule = new schedule.RecurrenceRule();
	rule.dayOfWeek = [new schedule.Range(1, 5)];
	rule.hour = 9;
	rule.minute = 0;
	rule.tz = "Asia/Jakarta";

	var cronfortesting = "*/5 * * * *";

	schedule.scheduleJob(cronfortesting, function() {
		console.log("Your job is running");
		reviewReminder.exec(app);
	});

}

async function autoCreateReleasePullRequest(app, context) {

	const payload = context.payload;
	const pullRequest = payload.pull_request;
	const pullRequestBody = pullRequest.body !== null ? pullRequest.body.concat(config.BOT_SIGNATURE) : config.BOT_SIGNATURE;
	const repository = pullRequest.base.repo.name;

	const listCommitsOnMaster = await requester.getCommitsOfBranch(app, context, config.MASTER_BRANCH_NAME);
	if (!Object.keys(listCommitsOnMaster).length) {
		app.log.info(`No commits found on ${config.MASTER_BRANCH_NAME}. Bot will not continue the process.`);
		return;
	}
	const commitMessage = listCommitsOnMaster.data[0].commit.message;
	const pullRequestNumber = util.getPullRequestNumberFromCommitMessage(commitMessage);
	const relBranchName = await util.generateRelBranchName(app, context, pullRequestNumber);
	if (relBranchName == "") {
		app.log.info(`Failed to generate new rel branch name. Bot will not continue the process.`);
		return;
	}
	const listCommitsOnDevelopment = await requester.getCommitsOfBranch(app, context, util.getDevelopmentBranchNameOf(repository));
	const developmentLatestCommitSHA = listCommitsOnDevelopment.data[0].sha;
	const isRelAlreadyExist = await requester.createBranch(app, context, "refs/heads/" + relBranchName, developmentLatestCommitSHA);
	if (isRelAlreadyExist) {
		app.log.info(`Failed to create branch ${relBranchName} on repository ${repository}, ${relBranchName} might be already exist. Bot will try to update ${relBranchName}.`);
		let relPullRequest = await requester.findRelPullRequest(app, context, relBranchName);
		if (!Object.keys(relPullRequest).length) {
			app.log.info(`Failed to find rel pull request. Bot will not continue the process`);
			return;
		}
		await requester.createComment(app, context, relPullRequest, `New update detected from ${util.getDevelopmentBranchNameOf(repository)}. Bot will try to update ${relBranchName}.`);
		let isUpdateFastForward = await requester.updateRelBranch(app, context, "heads/" + relBranchName, developmentLatestCommitSHA);
		if (!isUpdateFastForward) {
			await requester.createComment(app, context, relPullRequest, `Failed updating this rel, new update from ${util.getDevelopmentBranchNameOf(repository)} is not fast forward, please manually keep-up rel ${relBranchName} with ${util.getDevelopmentBranchNameOf(repository)}.`);
			await requester.createComment(app, context, pullRequest, `This update is not fast forward, please manually keep-up rel ${relPullRequest._links.html.href} with ${util.getDevelopmentBranchNameOf(repository)}.`);
		} else {
			await requester.createComment(app, context, relPullRequest, `Success, this branch is updated! You are good to go.`);
			await requester.createComment(app, context, pullRequest, `Your changes already pushed to existing release PR, visit ${relPullRequest._links.html.href}`);
		}
	} else {
		let releasePR = await requester.openPullRequestFromRelToMaster(app, context, relBranchName, pullRequestBody);
		if (Object.keys(releasePR).length) {
			await requester.createComment(app, context, pullRequest, `Release PR created, visit ${releasePR.data.html_url}`);
		}
	}

}

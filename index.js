var helper = require("./helper");
var config = require("./config");
var util = require("./util"); 

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
		const repository = pullRequest.base.repo.name;

		if (util.isFeatureMergedToDevelopment(context)) {
			const listCommits = await helper.getCommitsOfBranch(app, context, config.MASTER_BRANCH_NAME);
			if (!Object.keys(listCommits).length) {
				app.log.info(`No commits found on ${config.MASTER_BRANCH_NAME}. Bot will not continue the process.`);
				return;
			}
			const commitMessage = listCommits.data[0].commit.message;
			const pullRequestNumber = util.getPullRequestNumberFromCommitMessage(commitMessage);
			const relBranchName = await util.generateRelBranchName(app, context, pullRequestNumber);
			if (relBranchName == "") {
				app.log.info(`Failed to generate new rel branch name. Bot will not continue the process.`);
				return;
			}
			const latestCommitSHA = listCommits.data[0].sha;
			const isNewBranchCreated = await helper.createBranch(app, context, "refs/heads/" + relBranchName, latestCommitSHA);
			if (!isNewBranchCreated) {
				app.log.info(`Failed to create branch ${relBranchName} on repository ${repository}, ${relBranchName} might be already exist. Bot will continue to merge ${util.getDevelopmentBranchNameOf(repository)} to ${relBranchName}`);
			}
			await helper.mergeDevelopmentToRel(app, context, relBranchName);
			await helper.openPullRequestFromRelToMaster(app, context, relBranchName, pullRequestBody);
		} else if (util.isRelMergedToMaster(context)) {
			await helper.openPullRequestFromRelToDevelopment(app, context, headBranch, pullRequestBody);
		}
	});
}

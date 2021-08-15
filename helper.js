var config = require("./config");
var util = require("./util");

exports.getCommitsOfBranch = async (app, context, branch) => {
	const octokit = context.octokit;
	const payload = context.payload;
	const pullRequest = payload.pull_request;
	const repository = pullRequest.base.repo.name;
	var listCommits = {};
	try {
		listCommits = await octokit.rest.repos.listCommits({
			owner: config.REPOSITORY_OWNER_TESTING,
			repo: repository,
			sha: branch
		});
	} catch (error) {
		app.log.error(error);
	}
	return listCommits;	
};

exports.getRelBranches = async (app, context, pullRequestNumber) => {
	const octokit = context.octokit;
	const payload = context.payload;
	const pullRequest = payload.pull_request;
	const repository = pullRequest.base.repo.name;
	var listBranches = {};
	if (pullRequestNumber !== "") {
		try {
			let pr = await octokit.rest.pulls.get({
				owner: config.REPOSITORY_OWNER_TESTING,
				repo: repository,
				pull_number: pullRequestNumber
			});
			listBranches.data = [{"ref": pr.data.head.ref}];
		} catch (error) {
			app.log.error(error);
		}
	} else {
		try {
			listBranches = await octokit.rest.git.listMatchingRefs({
				owner: config.REPOSITORY_OWNER_TESTING,
				repo: repository,
				ref: config.SEARCH_REL_KEYWORD
			});
		} catch (error) {
			app.log.error(error);
		}
	}
	return listBranches;
};

exports.createBranch = async (app, context, newBranchName, branchingFromLattestCommit) => {
	const octokit = context.octokit;
	const payload = context.payload;
	const pullRequest = payload.pull_request;
	const repository = pullRequest.base.repo.name;
	let flag = true;
	try {
		await octokit.rest.git.createRef({
			owner: config.REPOSITORY_OWNER_TESTING,
			repo: repository,
			ref: newBranchName,
			sha: branchingFromLattestCommit
		});
	} catch (error) {
		app.log.error(error);
		flag = false;
	}
	return flag;
};

exports.mergeDevelopmentToRel = async (app, context, rel) => {
	const octokit = context.octokit;
	const payload = context.payload;
	const pullRequest = payload.pull_request;
	const repository = pullRequest.base.repo.name;
	try {
		await octokit.rest.repos.merge({
			owner: config.REPOSITORY_OWNER_TESTING,
			repo: repository,
			base: rel,
			head: util.getDevelopmentBranchNameOf(repository)
		});
	} catch (error) {
		app.log.error(error);
	}
};

exports.openPullRequestFromRelToMaster = async (app, context, rel, pullRequestBody) => {
	const octokit = context.octokit;
	const payload = context.payload;
	const pullRequest = payload.pull_request;
	const repository = pullRequest.base.repo.name;
	try {
		await octokit.rest.pulls.create({
			owner: config.REPOSITORY_OWNER_TESTING,
			repo: repository,
			head: rel,
			base: config.MASTER_BRANCH_NAME,
			title: "Release " + rel,
			body: pullRequestBody
		});
	} catch (error) {
		app.log.error(error);
	}
};

exports.openPullRequestFromRelToDevelopment = async (app, context, rel, pullRequestBody) => {
	const octokit = context.octokit;
	const payload = context.payload;
	const pullRequest = payload.pull_request;
	const repository = pullRequest.base.repo.name;
	try {
		await octokit.rest.pulls.create({
			owner: config.REPOSITORY_OWNER_TESTING,
			repo: repository,
			head: rel,
			base: util.getDevelopmentBranchNameOf(repository),
			title: "Mergeback " + rel + " to " + util.getDevelopmentBranchNameOf(repository),
			body: pullRequestBody
		});
	} catch (error) {
		app.log.error(error);
	}
};
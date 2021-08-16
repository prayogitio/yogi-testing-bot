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

exports.createBranch = async (app, context, newBranchName, branchingFromLatestCommit) => {
	const octokit = context.octokit;
	const payload = context.payload;
	const pullRequest = payload.pull_request;
	const repository = pullRequest.base.repo.name;
	let isRelAlreadyExist = false;
	try {
		await octokit.rest.git.createRef({
			owner: config.REPOSITORY_OWNER_TESTING,
			repo: repository,
			ref: newBranchName,
			sha: branchingFromLatestCommit
		});
	} catch (error) {
		app.log.error(error);
		if (error.status == 422) {
			isRelAlreadyExist = true;
		}
	}
	return isRelAlreadyExist;
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
	let isMergebackPullRequestOpened = true;
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
		if (error.status == 422) {
			isMergebackPullRequestOpened = false;
		}
	}
	return isMergebackPullRequestOpened;
};

exports.updateRelBranch = async (app, context, rel, sha) => {
	const octokit = context.octokit;
	const payload = context.payload;
	const pullRequest = payload.pull_request;
	const repository = pullRequest.base.repo.name;
	let isUpdateFastForward = true;
	try {
		await octokit.rest.git.updateRef({
			owner: config.REPOSITORY_OWNER_TESTING,
			repo: repository,
			ref: rel,
			sha: sha
		});
	} catch (error) {
		app.log.error(error);
		if (error.status == 422) {
			isUpdateFastForward = false;
		}
	}
	return isUpdateFastForward;
};

exports.createComment = async (app, context, pr, comment) => {
	const octokit = context.octokit;
	const payload = context.payload;
	const pullRequest = payload.pull_request;
	const repository = pullRequest.base.repo.name;
	try {
		await octokit.issues.createComment({
			owner: config.REPOSITORY_OWNER_TESTING,
			repo: repository,
			issue_number: pr == "" ? pullRequest.number : pr.number,
			body: comment + config.BOT_SIGNATURE
		});
	} catch (error) {
		app.log.error(error);
	}
};

exports.findRelPullRequest = async (app, context, rel) => {
	const octokit = context.octokit;
	const payload = context.payload;
	const pullRequest = payload.pull_request;
	const repository = pullRequest.base.repo.name;
	try {
		let relBranches = await octokit.rest.pulls.list({
			owner: config.REPOSITORY_OWNER_TESTING,
			repo: repository,
			state: "open",
			head: config.REPOSITORY_OWNER_TESTING + ":" + rel,
			base: config.MASTER_BRANCH_NAME
		});
		return relBranches.data.length > 0 ? relBranches.data[0] : {};
	} catch (error) {
		app.log.error(error);
	}
};

exports.deleteBranch = async (app, context, branch) => {
	const octokit = context.octokit;
	const payload = context.payload;
	const pullRequest = payload.pull_request;
	const repository = pullRequest.base.repo.name;
	try {
		await octokit.rest.git.deleteRef({
			owner: config.REPOSITORY_OWNER_TESTING,
			repo: repository,
			ref: branch
		});
	} catch (error) {
		app.log.error(error);
	}
};

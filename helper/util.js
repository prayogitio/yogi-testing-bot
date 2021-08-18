var config = require("./config");

exports.isFeatureMergedToDevelopment = (context) => {
	const payload = context.payload;
	const pullRequest = payload.pull_request;
	const isMerged = pullRequest.merged;
	const baseBranch = pullRequest.base.ref;
	const headBranch = pullRequest.head.ref;
	const repository = pullRequest.base.repo.name;

	return isMerged && baseBranch == getDevelopmentBranchNameOf(repository) && isDevelopmentBranch(headBranch, repository);
};

exports.isRelMergedToMaster = (context) => {
	const payload = context.payload;
	const pullRequest = payload.pull_request;
	const isMerged = pullRequest.merged;
	const baseBranch = pullRequest.base.ref;
	const headBranch = pullRequest.head.ref;

	return isMerged && baseBranch == config.MASTER_BRANCH_NAME && isReleaseBranch(headBranch);
};

exports.isRelMergedToDevelopment = (context) => {
	const payload = context.payload;
	const pullRequest = payload.pull_request;
	const isMerged = pullRequest.merged;
	const baseBranch = pullRequest.base.ref;
	const headBranch = pullRequest.head.ref;
	const repository = pullRequest.base.repo.name;

	return isMerged && baseBranch == getDevelopmentBranchNameOf(repository) && isReleaseBranch(headBranch);
};

function isDevelopmentBranch(headBranch, repository) {
	const developmentBranchPrefix = getDevelopmentBranchPrefixOf(repository);
	const pattern = new RegExp("^" + developmentBranchPrefix + ".*");
	let match = pattern.test(headBranch);

	return match ? true : false;
}

function isReleaseBranch(headBranch) {
	const pattern = new RegExp("^" + config.REL_BRANCH_NAME_PATTERN);
	let match = pattern.test(headBranch);

	return match ? true : false;
}

function getDevelopmentBranchNameOf(repository) {
	return config.DEVELOPMENT_BRANCH_NAME.get(repository);
}

exports.getDevelopmentBranchNameOf = getDevelopmentBranchNameOf;

function getDevelopmentBranchPrefixOf(repository) {
	return config.DEVELOPMENT_BRANCH_PREFIX.get(repository);
}

exports.generateRelBranchName = () => {
	const date = new Date();
	const year = date.getFullYear().toString().slice(-2);
	const month = ("0" + (date.getMonth() + 1).toString()).slice(-2);
	const day = ("0" + date.getDate().toString()).slice(-2);

	return "rel/2." + year + month + day;
};

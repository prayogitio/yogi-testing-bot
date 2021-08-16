var config = require("./config");
var requester = require("./requester");

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

function isReleaseBranch(headBranch, repository) {
	const pattern = new RegExp("^" + config.REL_BRANCH_NAME_PATTERN);
	let match = pattern.test(headBranch);

	return match ? true: false;
}

function getDevelopmentBranchNameOf(repository) {
	return config.DEVELOPMENT_BRANCH_NAME.get(repository);
}

exports.getDevelopmentBranchNameOf = getDevelopmentBranchNameOf;

function getDevelopmentBranchPrefixOf(repository) {
	return config.DEVELOPMENT_BRANCH_PREFIX.get(repository);
}

exports.getPullRequestNumberFromCommitMessage = (commitMessage) => {
	const pattern = new RegExp(config.MERGE_PULL_REQUEST_COMMIT_MESSAGE_PATTERN);
	const match = pattern.exec(commitMessage);

	return match == null ? "" : match[1];
};

exports.generateRelBranchName = async (app, context, pullRequestNumber) => {
	const date = new Date();
	const year = date.getFullYear().toString().slice(-2);
	const month = ("0" + (date.getMonth() + 1).toString()).slice(-2);
	const day = ("0" + date.getDate().toString()).slice(-2);
	const relBranches = await requester.getRelBranches(app, context, pullRequestNumber);
	if (!Object.keys(relBranches).length) {
		app.log.info(`Failed to detect rel branches on repository ${context.payload.pull_request.base.repo.name}`);
		return "";
	}
	const suffix = getRelBranchNameSuffix(relBranches);

	return "rel/2." + year + month + day + "." + suffix;
};

function getRelBranchNameSuffix(listBranches) {
	let majorVersion = "0";
	let minorVersion = "0";
	let minorVersionClamp = config.MINOR_VERSION_CLAMP;

	const pattern = new RegExp(config.REL_BRANCH_NAME_PATTERN);
	for (let index = 0; index < listBranches.data.length; index++) {
		let element = listBranches.data[index].ref;
		let match = pattern.exec(element);
		if (match) {
			if (parseInt(majorVersion) < parseInt(match[1])) {
				majorVersion = match[1];
				minorVersion = match[2] ? match[2] : "0";
			} else if (parseInt(minorVersion) < parseInt(match[2])) {
				minorVersion = match[2];
			}
		}
	}
	if (parseInt(minorVersion) >= minorVersionClamp) {
		majorVersion = (parseInt(majorVersion) + 1).toString();
		minorVersion = "0";
	} else {
		minorVersion = (parseInt(minorVersion) + 1).toString();
	}
	if (minorVersion == "0") {
		return majorVersion;
	} else {
		return majorVersion.concat(".").concat(minorVersion);
	}
}

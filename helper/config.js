var config = {};

config.REPOSITORY_OWNER = "kaskus";
config.REPOSITORY_OWNER_TESTING = "prayogitio";
config.MASTER_BRANCH_NAME = "master";
config.DEVELOPMENT_BRANCH_NAME = new Map();
config.DEVELOPMENT_BRANCH_PREFIX = new Map();
config.REL_BRANCH_NAME_PATTERN = "rel\/2.\\d{6}\.(\\d*)\.?(\\d*)";
config.BOT_SIGNATURE = "\n\n=========== AUTO GENERATED BY BOT ===========";
config.DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks/877141294416273479/Ssr8130TGAWflFoCUfkPZt4vAThYx082HBHJdCqSgNVw5kpzTOl5e3MdBjsloQvTuVNQ";

initializeDevelopmentBranchName();
initializeDevelopmentBranchPrefix();

function initializeDevelopmentBranchName() {
	config.DEVELOPMENT_BRANCH_NAME.set('kaskus-forum', 'development');
	config.DEVELOPMENT_BRANCH_NAME.set('kaskus-forum-wap', 'development');
	config.DEVELOPMENT_BRANCH_NAME.set('kaskus-core-forum', 'development');
	config.DEVELOPMENT_BRANCH_NAME.set('kaskus-api', 'development');
	config.DEVELOPMENT_BRANCH_NAME.set('kaskus-fjb', 'development');
	config.DEVELOPMENT_BRANCH_NAME.set('kaskus-fjb-wap', 'development');
	config.DEVELOPMENT_BRANCH_NAME.set('kaskus-core', 'dev-master');

	config.DEVELOPMENT_BRANCH_NAME.set('testing', 'development');
}

function initializeDevelopmentBranchPrefix() {
	config.DEVELOPMENT_BRANCH_PREFIX.set('kaskus-forum', 'development-');
	config.DEVELOPMENT_BRANCH_PREFIX.set('kaskus-forum-wap', 'development-');
	config.DEVELOPMENT_BRANCH_PREFIX.set('kaskus-core-forum', 'development-');
	config.DEVELOPMENT_BRANCH_PREFIX.set('kaskus-api', 'development-');
	config.DEVELOPMENT_BRANCH_PREFIX.set('kaskus-fjb', 'development-');
	config.DEVELOPMENT_BRANCH_PREFIX.set('kaskus-fjb-wap', 'development-');
	config.DEVELOPMENT_BRANCH_PREFIX.set('kaskus-core', 'dev-master-');

	config.DEVELOPMENT_BRANCH_PREFIX.set('testing', 'development-');
}

module.exports = config;

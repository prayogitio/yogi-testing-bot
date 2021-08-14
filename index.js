/**
 * This is the main entrypoint to your Probot app
 * @param {import('probot').Probot} app
 */
module.exports = (app) => {

  const REPOSITORY_OWNER = "kaskus";
  const REPOSITORY_OWNER_TESTING = "prayogitio";
  const MASTER_BRANCH_NAME = "master";
  const DEVELOPMENT_BRANCH_NAME = new Map();
  const DEVELOPMENT_BRANCH_PREFIX = new Map();

  initializeDevelopmentBranchName();
  initializeDevelopmentBranchPrefix();

  app.log.info("Yay, the app was loaded!");

  // Auto create branch REL and PR REL
  app.on("pull_request.closed", async (context) => {

    const payload = context.payload;
    const pullRequest = payload.pull_request;
    const isMerged = pullRequest.merged;
    const baseBranch = pullRequest.base.ref;
    const headBranch = pullRequest.head.ref;
    const pullRequestBody = pullRequest.body;
    const repository = pullRequest.base.repo.name;
    const octokit = context.octokit;
    const owner = REPOSITORY_OWNER_TESTING;

    if (isMerged && baseBranch == getDevelopmentBranchNameOf(repository) && isDevelopmentBranch(headBranch, repository)) {
      try {
        const listCommmits = await octokit.rest.repos.listCommits({
          owner: owner,
          repo: repository
        });
        var latestCommitSHA = listCommmits.data[0].sha;
        var relBranchName = await generateRelBranchName(owner, octokit, repository);
      } catch (error) {
        app.log.error(error);
      }

      try {
        await octokit.rest.git.createRef({
          owner: owner,
          repo: repository,
          ref: "refs/heads/" + relBranchName,
          sha: latestCommitSHA
        });
      } catch (error) {
        app.log.error(error);
      }

      try {
        await octokit.rest.repos.merge({
          owner: owner,
          repo: repository,
          base: relBranchName,
          head: getDevelopmentBranchNameOf(repository)
        });
      } catch (error) {
        app.log.error(error);
      }

      try {
        await octokit.rest.pulls.create({
          owner: owner,
          repo: repository,
          head: relBranchName,
          base: MASTER_BRANCH_NAME,
          title: relBranchName,
          body: pullRequestBody
        });
      } catch (error) {
        app.log.error(error);
      }
    } else if (isMerged && baseBranch == MASTER_BRANCH_NAME) {
      try {
        await octokit.rest.pulls.create({
          owner: owner,
          repo: repository,
          head: headBranch,
          base: getDevelopmentBranchNameOf(repository),
          title: "Mergeback " + headBranch,
          body: pullRequestBody
        });
      } catch (error) {
        app.log.error(error);
      }
    }
  });

  function isDevelopmentBranch(headBranch, repository) {
    const developmentBranchPrefix = getDevelopmentBranchPrefixOf(repository);
    const pattern = new RegExp("^" + developmentBranchPrefix + ".*");
    let match = pattern.test(headBranch);
    return match ? true : false;
  }

  function initializeDevelopmentBranchName() {
    DEVELOPMENT_BRANCH_NAME.set('kaskus-forum', 'development');
    DEVELOPMENT_BRANCH_NAME.set('kaskus-forum-wap', 'development');
    DEVELOPMENT_BRANCH_NAME.set('kaskus-core-forum', 'development');
    DEVELOPMENT_BRANCH_NAME.set('kaskus-api', 'development');
    DEVELOPMENT_BRANCH_NAME.set('kaskus-fjb', 'development');
    DEVELOPMENT_BRANCH_NAME.set('kaskus-fjb-wap', 'development');
    DEVELOPMENT_BRANCH_NAME.set('kaskus-core', 'dev-master');

    DEVELOPMENT_BRANCH_NAME.set('testing', 'development');
  }

  function initializeDevelopmentBranchPrefix() {
    DEVELOPMENT_BRANCH_PREFIX.set('kaskus-forum', 'development-');
    DEVELOPMENT_BRANCH_PREFIX.set('kaskus-forum-wap', 'development-');
    DEVELOPMENT_BRANCH_PREFIX.set('kaskus-core-forum', 'development-');
    DEVELOPMENT_BRANCH_PREFIX.set('kaskus-api', 'development-');
    DEVELOPMENT_BRANCH_PREFIX.set('kaskus-fjb', 'development-');
    DEVELOPMENT_BRANCH_PREFIX.set('kaskus-fjb-wap', 'development-');
    DEVELOPMENT_BRANCH_PREFIX.set('kaskus-core', 'dev-master-');

    DEVELOPMENT_BRANCH_PREFIX.set('testing', 'development-');
  }

  function getDevelopmentBranchNameOf(repository) {
    return DEVELOPMENT_BRANCH_NAME.get(repository);
  }

  function getDevelopmentBranchPrefixOf(repository) {
    return DEVELOPMENT_BRANCH_PREFIX.get(repository);
  }

  async function generateRelBranchName(owner, octokit, repository) {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = ("0" + (date.getMonth() + 1).toString()).slice(-2);
    const day = ("0" + date.getDate().toString()).slice(-2);
    let relCounter = await getRelCounter(owner, octokit, repository);
    return "rel/2." + year + month + day + "." + relCounter;
  }

  async function getRelCounter(owner, octokit, repository) {
    const listBranches = await octokit.rest.git.listMatchingRefs({
      owner: owner,
      repo: repository,
      ref: "heads/rel/2."
    });

    let majorVersion = "0";
    let minorVersion = "0";
    let minorVersionClamp = 5;

    const pattern = new RegExp("rel\/2.\\d{6}\.(\\d*)\.?(\\d*)");
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
};

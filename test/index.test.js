const nock = require("nock");
// Requiring our app implementation
const myProbotApp = require("..");
const { Probot, ProbotOctokit } = require("probot");
const fs = require("fs");
const path = require("path");

const privateKey = fs.readFileSync(
  path.join(__dirname, "fixtures/mock-cert.pem"),
  "utf-8"
);

describe("My Probot app", () => {
  let probot;

  beforeEach(() => {
    nock.disableNetConnect();
    probot = new Probot({
      appId: 123,
      privateKey,
      // disable request throttling and retries for testing
      Octokit: ProbotOctokit.defaults({
        retry: { enabled: false },
        throttle: { enabled: false },
      }),
    });
    // Load our app into probot
    probot.load(myProbotApp);
  });

  test("open mergeback PR after rel is merged to master", async () => {
    const payload = require("./fixtures/pull_request.closed.master");
    const expectedBody = {
      head: "rel/2.210815.3.5",
      base: "development",
      title: "Mergeback rel/2.210815.3.5 to development",
      body: "wkwkwkw"      
    };
    const mock = nock("https://api.github.com")
      .post("/app/installations/2/access_tokens")
      .reply(200, {
        token: "test",
        permissions: {
          pull_request: "write,read",
        },
      })

      .post("/repos/prayogitio/testing/pulls", (body) => {
        expect(body).toMatchObject(expectedBody);
        return true;
      })
      .reply(200);

    await probot.receive({ name: "pull_request", payload });

    expect(mock.pendingMocks()).toStrictEqual([]);
  });

  test("open relase PR after feature branch is merged to development", async () => {
    const payload = require("./fixtures/pull_request.closed.development");
    const mockListCommits = [
      {
        "commit": {
          "message": "Merge pull request #31 from blablabla"
        }
      }
    ];
    const mockPR = {
      "head": {
        "ref": "rel/2.210815.17.8"
      }
    };
    let isCreateBranchRequested = false;
    let isMergeDevelopmentToRelRequested = false;
    let isOpenPullRequestFromRelToMasterRequested = false;
    const mock = nock("https://api.github.com")
      .post("/app/installations/2/access_tokens")
      .reply(200, {
        token: "test",
        permissions: {
          pull_request: "read,write",
        },
      })

      .get("/repos/prayogitio/testing/commits?sha=master")
      .reply(200, mockListCommits)
      .get("/repos/prayogitio/testing/pulls/31")
      .reply(200, mockPR)

      .post("/repos/prayogitio/testing/git/refs", () => {
        isCreateBranchRequested = true;
        return true;
      })
      .reply(200)

      .post("/repos/prayogitio/testing/merges", () => {
        isMergeDevelopmentToRelRequested = true;
        return true;
      })
      .reply(200)

      .post("/repos/prayogitio/testing/pulls", () => {
        isOpenPullRequestFromRelToMasterRequested = true;
        return true;
      })
      .reply(200);

    await probot.receive({ name: "pull_request", payload });

    expect(mock.pendingMocks()).toStrictEqual([]);
    expect(isCreateBranchRequested).toStrictEqual(true);
    expect(isMergeDevelopmentToRelRequested).toStrictEqual(true);
    expect(isOpenPullRequestFromRelToMasterRequested).toStrictEqual(true);
  });

  afterEach(() => {
    nock.cleanAll();
    nock.enableNetConnect();
  });
});

// For more information about testing with Jest see:
// https://facebook.github.io/jest/

// For more information about testing with Nock see:
// https://github.com/nock/nock

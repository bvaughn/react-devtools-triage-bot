const nock = require('nock');
const fs = require('fs');
const path = require('path');

// Requiring our app implementation
const myProbotApp = require('..');
const { Probot } = require('probot');

describe('My Probot app', () => {
  let probot;
  let mockCert;

  beforeAll(done => {
    fs.readFile(
      path.join(__dirname, 'fixtures/mock-cert.pem'),
      (error, cert) => {
        if (error) return done(error);
        mockCert = cert;
        done();
      }
    );
  });

  beforeEach(() => {
    nock.disableNetConnect();

    probot = new Probot({ id: 123, cert: mockCert });
    probot.load(myProbotApp);

    // Test that we correctly return a test token
    nock('https://api.github.com:443', { encodedQueryParams: true })
      .post('/app/installations/6332821/access_tokens', {})
      .reply(200, { token: 'test' });

    // DEBUG
    //nock.recorder.rec();
  });

  afterEach(() => {
    nock.cleanAll();
    nock.enableNetConnect();
  });

  test('triages issues that are opened without repro info', async done => {
    let didReceiveComment = false;

    // Test that a comment is posted
    nock('https://api.github.com:443')
      //.post('/repos/bvaughn/react-devtools-triage-bot/issues/1/comments', body => {
      .post('/repos', body => {
        didReceiveComment = true;
        expect(body).toMatchObject(issueCreatedBody);
        return true;
      })
      .reply(200);

    // Receive a webhook event
    await probot.receive({
      name: 'issues',
      payload: require('./fixtures/issues.opened.missing-info.json'),
    });

    expect(didReceiveComment).toBe(true);

    done();
  });

  test('does not modify issues that have repro info', async done => {
    let didReceiveComment = false;

    // Test that a comment is posted
    nock('https://api.github.com:443')
      .post(
        '/repos/bvaughn/react-devtools-triage-bot/issues/1/comments',
        body => {
          didReceiveComment = true;
          return true;
        }
      )
      .reply(200);

    // Receive a webhook event
    await probot.receive({
      name: 'issues',
      payload: require('./fixtures/issues.opened.has-info.json'),
    });

    expect(didReceiveComment).toBe(false);

    done();
  });
});

// For more information about testing with Jest see:
// https://facebook.github.io/jest/

// For more information about testing with Nock see:
// https://github.com/nock/nock

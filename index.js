/**
 * This is the main entrypoint to your Probot app
 * @param {import('probot').Application} app
 */
module.exports = app => {
  app.on('issues.opened', async context => {
    let { assignees, body, labels, user } = context.payload.issue;

    // Convert newlines to match our local template string.
    body = body.replace(/[\r\n]+/g, '\n');

    // Check for a bug report without any repro steps.
    // Detecting this is tricky, but an empty ordered list is a good indicator.
    if (body.indexOf(EMPTY_ORDERED_LIST) >= 0) {
      context.github.issues.createComment(
        context.issue({
          body: COMMENT_ASK_FOR_REPRO.replace('@user', `@${user.login}`),
        })
      );
      if (!labels.find(label => label.name === LABEL_DEVELOPER_TOOLS)) {
        context.github.issues.addLabels(
          context.issue({
            labels: [LABEL_DEVELOPER_TOOLS],
          })
        );
      }
      if (!labels.find(label => label.name === LABEL_NEEDS_INFO)) {
        context.github.issues.addLabels(
          context.issue({
            labels: [LABEL_NEEDS_INFO],
          })
        );
      }
      if (!assignees.find(assignee => assignee.login === user.login)) {
        context.github.issues.addAssignees(
          context.issue({
            assignees: [user.login],
          })
        );
      }
    }
  });

  app.on('issues.edited', async context => {
    let { assignees, body, labels, user } = context.payload.issue;

    // Convert newlines to match our local template string.
    body = body.replace(/[\r\n]+/g, '\n');

    // Check for a bug report without any repro steps.
    // Detecting this is tricky, but an empty ordered list is a good indicator.
    if (body.indexOf(EMPTY_ORDERED_LIST) < 0) {
      // If there are repro instructions, were they added with this edit?
      const { body: prevBody } = context.payload.changes;

      if (prevBody) {
        // Convert newlines to match our local template string.
        prevBody.from = prevBody.from.replace(/[\r\n]+/g, '\n');

        if (prevBody.from && prevBody.from.indexOf(EMPTY_ORDERED_LIST) >= 0) {
          if (labels.find(label => label.name === LABEL_NEEDS_INFO)) {
            context.github.issues.removeLabel(
              context.issue({
                name: LABEL_NEEDS_INFO,
              })
            );
          }
          if (!labels.find(label => label.name === LABEL_STATUS_UNCONFIRMED)) {
            context.github.issues.addLabels(
              context.issue({
                labels: [LABEL_STATUS_UNCONFIRMED],
              })
            );
          }
          if (assignees.find(assignee => assignee.login === user.login)) {
            context.github.issues.removeAssignees(
              context.issue({
                assignees: [user.login],
              })
            );
          }
        }
      }
    } else {
      context.log('still there!');
    }
  });

  // For more information on building apps:
  // https://probot.github.io/docs/

  // To get your app running against GitHub, see:
  // https://probot.github.io/docs/development/
};

const LABEL_DEVELOPER_TOOLS = 'Component: Developer Tools';
const LABEL_NEEDS_INFO = 'Resolution: Needs More Information';
const LABEL_STATUS_UNCONFIRMED = 'Status: Unconfirmed';

const EMPTY_ORDERED_LIST = `Describe what you were doing when the bug occurred:\n1. \n2. \n3. `;

const COMMENT_ASK_FOR_REPRO = `@user It doesn't look like this bug report has enough info for one of us to reproduce it. Please update the issue description to add more information!

Issues with no repro info may be closed.

Thank you!`;

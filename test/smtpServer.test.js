const test = require('node:test');
const assert = require('node:assert/strict');
const { isAddressAllowed } = require('../src/smtpServer');

test('isAddressAllowed validation logic', async (t) => {
  await t.test('allows any address when no email or domain restrictions are specified', () => {
    assert.equal(isAddressAllowed('user@example.com', [], []), true);
    assert.equal(isAddressAllowed('user@other.org', null, undefined), true);
  });

  await t.test('allows address matching allowed_emails list', () => {
    const allowedEmails = ['sender@example.com', 'admin@example.com'];
    assert.equal(isAddressAllowed('sender@example.com', allowedEmails, []), true);
    assert.equal(isAddressAllowed('admin@example.com', allowedEmails, []), true);
    assert.equal(isAddressAllowed('other@example.com', allowedEmails, []), false);
  });

  await t.test('allows address matching allowed_domains list', () => {
    const allowedDomains = ['example.com', 'mydomain.org'];
    assert.equal(isAddressAllowed('alice@example.com', [], allowedDomains), true);
    assert.equal(isAddressAllowed('bob@mydomain.org', [], allowedDomains), true);
    assert.equal(isAddressAllowed('charlie@otherdomain.com', [], allowedDomains), false);
  });

  await t.test('allows address matching either email or domain when both specified', () => {
    const allowedEmails = ['special@unrelated.com'];
    const allowedDomains = ['company.com'];
    assert.equal(isAddressAllowed('special@unrelated.com', allowedEmails, allowedDomains), true);
    assert.equal(isAddressAllowed('anyone@company.com', allowedEmails, allowedDomains), true);
    assert.equal(isAddressAllowed('stranger@unrelated.com', allowedEmails, allowedDomains), false);
  });
});

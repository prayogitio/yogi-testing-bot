var config = require("../helper/config");
const webhook = require("webhook-discord");
const Hook = new webhook.Webhook(config.DISCORD_WEBHOOK_URL);

exports.sendReminderMessage = (reminderMessage) => {
	Hook.info("Captain Hook", reminderMessage);
};

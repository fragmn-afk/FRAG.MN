import { randomUUID } from 'node:crypto';
import { getColor } from '../../config/bot.js';
import { SlashCommandBuilder, PermissionFlagsBits, PermissionsBitField, ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } from 'discord.js';
import { createEmbed, successEmbed, infoEmbed, warningEmbed } from '../../utils/embeds.js';
import { getGuildConfig, setGuildConfig } from '../../services/config/guildConfig.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { logger } from '../../utils/logger.js';
import { handleInteractionError, replyUserError, ErrorTypes } from '../../utils/errorHandler.js';

import ticketConfig from './modules/ticket_dashboard.js';
import { executeTicketEscalation } from './ticket-escalate.js';

export default {
    data: new SlashCommandBuilder()
        .setName("ticket")
        .setDescription("Manages the server's ticket system.")
        .addSubcommand((subcommand) =>
            subcommand
                .setName("setup")
                .setDescription(
                    "Sets up the ticket creation panel in a specified channel.",
                )
                .addChannelOption((option) =>
                    option
.setName("panel_channel")
                        .setDescription(
                            "The channel where the ticket panel will be sent.",
                        )
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true),
                )

                .addStringOption((option) =>
                    option
                        .setName("panel_message")
                        .setDescription(
                            "The main message/description for the ticket panel.",
                        )
                        .setRequired(true),
                )
                .addStringOption((option) =>
                    option
                        .setName("button_label")
                        .setDescription(
                            "The label for the ticket creation button (default: Create Ticket)",
                        )
                        .setRequired(false),
                )
                .addChannelOption((option) =>
                    option
                        .setName("category")
                        .setDescription(
                            "The category where new tickets will be created (optional).",
                        )
                        .addChannelTypes(ChannelType.GuildCategory)
                        .setRequired(false),
                )
                .addChannelOption((option) =>
                    option
                        .setName("closed_category")
                        .setDescription(
                            "The category where closed tickets will be moved (optional).",
                        )
                        .addChannelTypes(ChannelType.GuildCategory)
                        .setRequired(false),
                )
                .addRoleOption((option) =>
                    option
                        .setName("staff_role")
                        .setDescription(
                            "The role that can access tickets (optional).",
                        )
                        .setRequired(false),
                )
                .addIntegerOption((option) =>
                    option
                        .setName("max_tickets_per_user")
                        .setDescription("Maximum number of tickets a user can create (default: 3)")
                        .setMinValue(1)
                        .setMaxValue(10)
                        .setRequired(false),
                )
                .addBooleanOption((option) =>
                    option
                        .setName("dm_on_close")
                        .setDescription("Send DM to user when their ticket is closed (default: true)")
                        .setRequired(false),
                ),
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName("dashboard")
                .setDescription("Open the interactive ticket system dashboard"),
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName("panel-create")
                .setDescription("Create an additional ticket panel with independent settings")
                .addStringOption((option) => option.setName("name").setDescription("Panel name").setRequired(true))
                .addChannelOption((option) => option.setName("panel_channel").setDescription("Where to post this panel").addChannelTypes(ChannelType.GuildText).setRequired(true))
                .addStringOption((option) => option.setName("panel_message").setDescription("Panel description").setRequired(true))
                .addStringOption((option) => option.setName("button_label").setDescription("Create button text").setRequired(false))
                .addChannelOption((option) => option.setName("category").setDescription("Open ticket category").addChannelTypes(ChannelType.GuildCategory).setRequired(false))
                .addChannelOption((option) => option.setName("closed_category").setDescription("Closed ticket category").addChannelTypes(ChannelType.GuildCategory).setRequired(false))
                .addRoleOption((option) => option.setName("staff_role").setDescription("Staff role that can view tickets").setRequired(false))
                .addRoleOption((option) => option.setName("required_role").setDescription("Role required to open this panel").setRequired(false))
                .addRoleOption((option) => option.setName("escalate_role").setDescription("Role to notify when a ticket is escalated").setRequired(false))
                .addIntegerOption((option) => option.setName("max_tickets_per_user").setDescription("Maximum open tickets in this panel").setMinValue(1).setMaxValue(10).setRequired(false))
                .addBooleanOption((option) => option.setName("dm_on_close").setDescription("DM the ticket creator on close").setRequired(false))
                .addBooleanOption((option) => option.setName("auto_ping").setDescription("Ping the configured staff role").setRequired(false))
                .addChannelOption((option) => option.setName("transcript_channel").setDescription("Transcript destination").addChannelTypes(ChannelType.GuildText).setRequired(false))
                .addChannelOption((option) => option.setName("logs_channel").setDescription("Ticket logs destination").addChannelTypes(ChannelType.GuildText).setRequired(false))
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName("panels")
                .setDescription("List all configured ticket panels"),
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName("panel-delete")
                .setDescription("Delete a ticket panel by its ID")
                .addStringOption((option) => option.setName("panel_id").setDescription("Panel ID shown by /ticket panels").setRequired(true)),
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName("panel-access")
                .setDescription("Manage roles and users allowed or blocked from a panel")
                .addStringOption((option) => option.setName("panel_id").setDescription("Panel ID").setRequired(true))
                .addStringOption((option) => option.setName("action").setDescription("Access rule to update").setRequired(true)
                    .addChoices(
                        { name: "Allow Role", value: "allow-role" },
                        { name: "Remove Allowed Role", value: "remove-allow-role" },
                        { name: "Block Role", value: "deny-role" },
                        { name: "Unblock Role", value: "remove-deny-role" },
                        { name: "Block User", value: "deny-user" },
                        { name: "Unblock User", value: "allow-user" },
                    ))
                .addRoleOption((option) => option.setName("role").setDescription("Role for this access rule").setRequired(false))
                .addUserOption((option) => option.setName("user").setDescription("User for this access rule").setRequired(false)),
        ),
        .addSubcommand((subcommand) => subcommand
            .setName('escalate')
            .setDescription('Escalate the current ticket to its configured escalation role')
            .addStringOption((option) => option.setName('reason').setDescription('Why this ticket needs escalation').setRequired(false))),
    category: "ticket",

    async execute(interaction, config, client) {
        const subcommand = interaction.options.getSubcommand();
        if (subcommand === 'escalate') {
            return executeTicketEscalation(interaction, client);
        }

        const deferred = await InteractionHelper.safeDefer(interaction, { flags: MessageFlags.Ephemeral });
        if (!deferred) {
            return;
        }

        if (
            !interaction.member.permissions.has(
                PermissionFlagsBits.ManageChannels,
            )
        ) {
            logger.warn('Ticket command permission denied', {
                userId: interaction.user.id,
                guildId: interaction.guildId,
                commandName: 'ticket'
            });
            return await replyUserError(interaction, { type: ErrorTypes.PERMISSION, message: 'You need the `Manage Channels` permission for this action.' });
        }

        if (subcommand === "dashboard") {
            return ticketConfig.execute(interaction, config, client);
        }

        if (subcommand === "panels") {
            const guildConfig = await getGuildConfig(client, interaction.guildId);
            const panels = Array.isArray(guildConfig.ticketPanels) ? guildConfig.ticketPanels : [];
            const fields = panels.map((panel) => ({
                name: panel.name + " • " + panel.id,
                value: "Channel: <#" + panel.channelId + ">\nStaff: " + (panel.staffRoleId ? "<@&" + panel.staffRoleId + ">" : "Not set") +
                    "\nRequired role: " + (panel.requiredRoleId ? "<@&" + panel.requiredRoleId + ">" : "Anyone") +
                    "\nMax open tickets: " + (panel.maxTicketsPerUser || 3),
                inline: false,
            }));
            if (!fields.length) {
                fields.push({ name: "No additional panels", value: "Create one with /ticket panel-create. Your legacy panel, if any, remains active.", inline: false });
            }
            const embed = createEmbed({
                title: "🎫 Ticket Panels",
                description: "Additional panel configurations for this server.",
                color: getColor('info'),
                fields,
            });
            return InteractionHelper.safeEditReply(interaction, { embeds: [embed] });
        }

        if (subcommand === "panel-delete") {
            const guildConfig = await getGuildConfig(client, interaction.guildId);
            const panelId = interaction.options.getString("panel_id", true);
            const panels = Array.isArray(guildConfig.ticketPanels) ? [...guildConfig.ticketPanels] : [];
            const index = panels.findIndex((panel) => panel.id === panelId);
            if (index === -1) {
                return replyUserError(interaction, { type: ErrorTypes.USER_INPUT, message: "Panel ID олдсонгүй. /ticket panels ашиглан ID-гаа шалгана уу." });
            }

            const [removed] = panels.splice(index, 1);
            const panelChannel = await interaction.guild.channels.fetch(removed.channelId).catch(() => null);
            const panelMessage = panelChannel?.messages
                ? await panelChannel.messages.fetch(removed.messageId).catch(() => null)
                : null;
            if (panelMessage) await panelMessage.delete().catch(() => {});
            guildConfig.ticketPanels = panels;
            await setGuildConfig(client, interaction.guildId, guildConfig);
            return InteractionHelper.safeEditReply(interaction, {
                embeds: [successEmbed("Ticket Panel Deleted", "Deleted **" + removed.name + "** (" + removed.id + "). Existing tickets created from this panel are not deleted.")],
            });
        }

        if (subcommand === "panel-create") {
            const guildConfig = await getGuildConfig(client, interaction.guildId);
            const panels = Array.isArray(guildConfig.ticketPanels) ? [...guildConfig.ticketPanels] : [];
            if (panels.length >= 10) {
                return replyUserError(interaction, { type: ErrorTypes.VALIDATION, message: "Нэг серверт хамгийн ихдээ 10 нэмэлт ticket panel үүсгэж болно." });
            }

            const panelName = interaction.options.getString("name", true).trim().slice(0, 80);
            const panelChannel = interaction.options.getChannel("panel_channel", true);
            const category = interaction.options.getChannel("category");
            const closedCategory = interaction.options.getChannel("closed_category");
            const staffRole = interaction.options.getRole("staff_role");
            const requiredRole = interaction.options.getRole("required_role");
            const escalateRole = interaction.options.getRole("escalate_role");
            const transcriptChannel = interaction.options.getChannel("transcript_channel");
            const logsChannel = interaction.options.getChannel("logs_channel");
            const maxTicketsPerUser = interaction.options.getInteger("max_tickets_per_user") || 3;
            const panelMessage = interaction.options.getString("panel_message", true).trim().slice(0, 4000);
            const buttonLabel = (interaction.options.getString("button_label") || "").trim().slice(0, 80) || "Create Ticket";
            const dmOnClose = interaction.options.getBoolean("dm_on_close") !== false;
            const autoPing = interaction.options.getBoolean("auto_ping") !== false;

            const botMember = await interaction.guild.members.fetchMe().catch(() => null);
            if (!botMember) {
                return replyUserError(interaction, { type: ErrorTypes.UNKNOWN, message: "Bot-ийн server member мэдээллийг авч чадсангүй." });
            }
            for (const role of [staffRole, escalateRole].filter(Boolean)) {
                if (
                    role.id === interaction.guild.id ||
                    role.managed ||
                    role.permissions.has(PermissionFlagsBits.Administrator) ||
                    role.position >= botMember.roles.highest.position
                ) {
                    return replyUserError(interaction, {
                        type: ErrorTypes.VALIDATION,
                        message: "Staff болон escalation role нь @everyone биш, managed/Admin биш, bot-ийн хамгийн өндөр role-оос доор байх ёстой.",
                    });
                }
            }

            const panelPermissions = panelChannel.permissionsFor(botMember);
            if (!panelPermissions?.has([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks])) {
                return replyUserError(interaction, {
                    type: ErrorTypes.PERMISSION,
                    message: "Bot panel channel-д View Channel, Send Messages, Embed Links эрхтэй байх шаардлагатай.",
                });
            }

            const panelId = randomUUID().replace(/-/g, "").slice(0, 8);
            const panel = {
                id: panelId,
                name: panelName || "Support",
                channelId: panelChannel.id,
                messageId: null,
                panelMessage,
                buttonLabel,
                categoryId: category?.id || null,
                closedCategoryId: closedCategory?.id || null,
                staffRoleId: staffRole?.id || null,
                requiredRoleId: requiredRole?.id || null,
                escalateRoleId: escalateRole?.id || null,
                allowedRoleIds: [],
                blacklistedRoleIds: [],
                blacklistedUserIds: [],
                maxTicketsPerUser,
                dmOnClose,
                autoPing,
                transcriptChannelId: transcriptChannel?.id || null,
                ticketLogsChannelId: logsChannel?.id || null,
                createdAt: new Date().toISOString(),
                createdBy: interaction.user.id,
            };

            try {
                const panelEmbed = createEmbed({
                    title: panel.name,
                    description: panel.panelMessage,
                    color: getColor('info'),
                });
                const panelButton = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId("create_ticket:" + panelId)
                        .setLabel(panel.buttonLabel)
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji("📩"),
                );
                const sentMessage = await panelChannel.send({ embeds: [panelEmbed], components: [panelButton] });
                panel.messageId = sentMessage.id;

                panels.push(panel);
                guildConfig.ticketPanels = panels;
                await setGuildConfig(client, interaction.guildId, guildConfig);

                return InteractionHelper.safeEditReply(interaction, {
                    embeds: [successEmbed(
                        "Ticket Panel Created",
                        "**" + panel.name + "** panel-г " + panelChannel + " сувагт байршууллаа.\n\nPanel ID: `" + panelId +
                        "`\nMax tickets: **" + maxTicketsPerUser + "**\nStaff: " + (staffRole ? staffRole.toString() : "Not set"),
                    )],
                });
            } catch (error) {
                logger.error("Failed to create additional ticket panel", {
                    guildId: interaction.guildId, panelId, error: error.message,
                });
                if (panel.messageId) {
                    await panelChannel.messages.fetch(panel.messageId).then((message) => message.delete()).catch(() => {});
                }
                return replyUserError(interaction, {
                    type: ErrorTypes.UNKNOWN,
                    message: "Ticket panel үүсгэж/хадгалж чадсангүй. Bot-ийн channel permission болон database connection-ийг шалгана уу.",
                });
            }
        }

        if (subcommand === "panel-access") {
            const guildConfig = await getGuildConfig(client, interaction.guildId);
            const panelId = interaction.options.getString("panel_id", true);
            const action = interaction.options.getString("action", true);
            const role = interaction.options.getRole("role");
            const user = interaction.options.getUser("user");
            const panels = Array.isArray(guildConfig.ticketPanels) ? [...guildConfig.ticketPanels] : [];
            const panel = panels.find((item) => item.id === panelId);
            if (!panel) {
                return replyUserError(interaction, { type: ErrorTypes.USER_INPUT, message: "Panel ID олдсонгүй. /ticket panels ашиглана уу." });
            }

            const roleActions = ["allow-role", "remove-allow-role", "deny-role", "remove-deny-role"];
            const userActions = ["deny-user", "allow-user"];
            if (roleActions.includes(action) && !role) {
                return replyUserError(interaction, { type: ErrorTypes.VALIDATION, message: "Энэ үйлдэлд role сонгоно уу." });
            }
            if (userActions.includes(action) && !user) {
                return replyUserError(interaction, { type: ErrorTypes.VALIDATION, message: "Энэ үйлдэлд user сонгоно уу." });
            }

            const updateList = (property, value, add) => {
                const current = Array.isArray(panel[property]) ? [...panel[property]] : [];
                const index = current.indexOf(value);
                if (add && index === -1) current.push(value);
                if (!add && index !== -1) current.splice(index, 1);
                panel[property] = current;
            };

            if (action === "allow-role") updateList("allowedRoleIds", role.id, true);
            if (action === "remove-allow-role") updateList("allowedRoleIds", role.id, false);
            if (action === "deny-role") updateList("blacklistedRoleIds", role.id, true);
            if (action === "remove-deny-role") updateList("blacklistedRoleIds", role.id, false);
            if (action === "deny-user") updateList("blacklistedUserIds", user.id, true);
            if (action === "allow-user") updateList("blacklistedUserIds", user.id, false);

            guildConfig.ticketPanels = panels;
            await setGuildConfig(client, interaction.guildId, guildConfig);
            const subject = role ? role.toString() : user.toString();
            return InteractionHelper.safeEditReply(interaction, {
                embeds: [successEmbed("Ticket Panel Access Updated", action + " applied to " + subject + " for panel **" + panel.name + "**.")],
            });
        }

        if (subcommand === "setup") {
            const existingConfig = await getGuildConfig(client, interaction.guildId);
            if (existingConfig?.ticketPanelChannelId) {
                return await replyUserError(interaction, { type: ErrorTypes.UNKNOWN, message: `This server already has a ticket system set up (panel in <#${existingConfig.ticketPanelChannelId}>).\n\nOnly one ticket system is supported per server. Use \`/ticket dashboard\` to edit or update the existing setup, or select **Delete System** from the dashboard to remove it and start fresh.` });
            }

            const panelChannel =
                interaction.options.getChannel("panel_channel");
            const categoryChannel = interaction.options.getChannel("category");
            const closedCategoryChannel = interaction.options.getChannel("closed_category");
            const staffRole = interaction.options.getRole("staff_role");
const panelMessage = interaction.options.getString("panel_message") || "Click the button below to create a support ticket.";
            const buttonLabel =
                interaction.options.getString("button_label") ||
"Create Ticket";
            const maxTicketsPerUser = interaction.options.getInteger("max_tickets_per_user") || 3;
const dmOnClose = interaction.options.getBoolean("dm_on_close") !== false;

            const setupEmbed = createEmbed({ 
                title: "Support Tickets", 
description: panelMessage,
                color: getColor('info')
            });

            const ticketButton = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId("create_ticket")
.setLabel(buttonLabel)
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji("📩"),
            );

            try {
                const sentPanel = await panelChannel.send({
                    embeds: [setupEmbed],
                    components: [ticketButton],
                });

                if (client.db && interaction.guildId) {
                    const currentConfig = existingConfig;
                    currentConfig.ticketCategoryId = categoryChannel ? categoryChannel.id : null;
                    currentConfig.ticketClosedCategoryId = closedCategoryChannel ? closedCategoryChannel.id : null;
                    currentConfig.ticketStaffRoleId = staffRole ? staffRole.id : null;
                    currentConfig.ticketPanelChannelId = panelChannel.id;
                    currentConfig.ticketPanelMessageId = sentPanel?.id || null;
                    currentConfig.ticketPanelMessage = panelMessage;
                    currentConfig.ticketButtonLabel = buttonLabel;
                    currentConfig.maxTicketsPerUser = maxTicketsPerUser;
                    currentConfig.dmOnClose = dmOnClose;

                    await setGuildConfig(client, interaction.guildId, currentConfig);
                    logger.info('Ticket configuration saved', {
                        guildId: interaction.guildId,
                        categoryId: categoryChannel?.id,
                        closedCategoryId: closedCategoryChannel?.id,
                        staffRoleId: staffRole?.id,
                        maxTickets: maxTicketsPerUser,
                        dmOnClose: dmOnClose,
                    });
                } else {
                    logger.error('Ticket setup: database unavailable, panel sent but configuration was NOT saved', {
                        guildId: interaction.guildId,
                    });
                }

                let successMessage = `The ticket creation panel has been sent to ${panelChannel}.`;
                
                if (categoryChannel) {
                    successMessage += `New tickets will be created in the **${categoryChannel.name}** category.`;
                } else {
                    successMessage += 'New tickets will be created in a new "Tickets" category.';
                }
                
                if (closedCategoryChannel) {
                    successMessage += `Closed tickets will be moved to **${closedCategoryChannel.name}**.`;
                }
                
                if (staffRole) {
                    successMessage += `**${staffRole.name}** role will have access to tickets.`;
                }
                
                successMessage += `\n\n**Max Tickets Per User:** ${maxTicketsPerUser}\n**DM on Close:** ${dmOnClose ? 'Enabled' : 'Disabled'}`;

                await InteractionHelper.safeEditReply(interaction, {
                    embeds: [
                        successEmbed(
                            "Ticket Panel Set Up",
                            successMessage,
                        ),
                    ],
                });

                logger.info('Ticket panel setup completed', {
                    userId: interaction.user.id,
                    userTag: interaction.user.tag,
                    guildId: interaction.guildId,
                    panelChannelId: panelChannel.id,
                    categoryId: categoryChannel?.id,
                    closedCategoryId: closedCategoryChannel?.id,
                    staffRoleId: staffRole?.id,
                    maxTickets: maxTicketsPerUser,
                    dmOnClose: dmOnClose,
                    commandName: 'ticket_setup'
                });

                const logEmbed = createEmbed({
                    title: "Ticket System Setup (Configuration Log)",
                    description: `The ticket panel was set up in ${panelChannel} by ${interaction.user}.`,
                    color: getColor('warning')
                })
                    .addFields(
                        {
                            name: "Panel Channel",
                            value: panelChannel.toString(),
                            inline: true,
                        },
                        {
                            name: "Ticket Category",
                            value: categoryChannel
                                ? categoryChannel.toString()
                                : "None specified.",
                            inline: true,
                        },
                        {
                            name: "Closed Category",
                            value: closedCategoryChannel
                                ? closedCategoryChannel.toString()
                                : "None specified.",
                            inline: true,
                        },
                        {
                            name: "Staff Role",
                            value: staffRole
                                ? staffRole.toString()
                                : "None specified.",
                            inline: true,
                        },
                        {
                            name: "Max Tickets Per User",
                            value: maxTicketsPerUser.toString(),
                            inline: true,
                        },
                        {
                            name: "DM on Close",
                            value: dmOnClose ? 'Enabled' : 'Disabled',
                            inline: true,
                        },
                        {
                            name: "Moderator",
                            value: `${interaction.user.tag} (${interaction.user.id})`,
                            inline: false,
                        },
                    );

            } catch (error) {
                logger.error('Ticket setup error', {
                    error: error.message,
                    stack: error.stack,
                    userId: interaction.user.id,
                    guildId: interaction.guildId,
                    commandName: 'ticket_setup'
                });
                if (interaction.deferred || interaction.replied) {
                    await replyUserError(interaction, { type: ErrorTypes.UNKNOWN, message: 'Could not send the ticket panel or save configuration. Check the bot\'s permissions (especially the ability to send messages in the target channel) and database connection.' }).catch(err => {
                        logger.error('Failed to send error reply', {
                            error: err.message,
                            guildId: interaction.guildId
                        });
                    });
                } else {
                    await handleInteractionError(interaction, error, {
                        commandName: 'ticket_setup',
                        source: 'ticket_setup_command'
                    });
                }
            }
        }
    }
};
import { SlashCommandBuilder } from 'discord.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import {
    skipНэг дуу,
    stopPlayback,
    pausePlayback,
    resumePlayback,
    shuffleДараалал,
    setLoopMode,
    setVolume,
    seekTrack,
    removeFromQueue,
    moveInQueue,
    clearQueue,
    setTwentyFourSeven,
    leaveVoiceChannel,
    replyMusicSuccess,
} from '../../services/music/musicActions.js';
import { deferMusicCommand } from '../../services/music/prefixSupport.js';

export default {
    category: 'Music',
    data: new SlashCommandBuilder()
        .setName('music')
        .setDescription('Хөгжим, дараалал болон voice тохиргоог удирдах')
        .addSubcommand((sub) =>
            sub.setName('pause').setDescription('Хөгжим түр зогсоох'),
        )
        .addSubcommand((sub) =>
            sub.setName('resume').setDescription('Хөгжим үргэлжлүүлэх'),
        )
        .addSubcommand((sub) =>
            sub.setName('skip').setDescription('Одоогийн дууг алгасах'),
        )
        .addSubcommand((sub) =>
            sub.setName('stop').setDescription('Хөгжим зогсоож дараалал цэвэрлэх'),
        )
        .addSubcommand((sub) =>
            sub.setName('shuffle').setDescription('Дууны дарааллыг холих'),
        )
        .addSubcommand((sub) =>
            sub
                .setName('loop')
                .setDescription('Давталтын горим тохируулах')
                .addStringOption((opt) =>
                    opt
                        .setName('mode')
                        .setDescription('Давталтын горим')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Унтраах', value: 'none' },
                            { name: 'Track', value: 'track' },
                            { name: 'Queue', value: 'queue' },
                        ),
                ),
        )
        .addSubcommand((sub) =>
            sub
                .setName('volume')
                .setDescription('Дууны чанга сул тохируулах')
                .addIntegerOption((opt) =>
                    opt.setName('level').setDescription('Дууны түвшин (0–100)').setRequired(true).setMinValue(0).setMaxValue(100),
                ),
        )
        .addSubcommand((sub) =>
            sub
                .setName('seek')
                .setDescription('Дууны тодорхой хугацаа руу шилжих')
                .addIntegerOption((opt) =>
                    opt.setName('seconds').setDescription('Хугацаа (секунд)').setRequired(true).setMinValue(0),
                ),
        )
        .addSubcommand((sub) =>
            sub
                .setName('remove')
                .setDescription('Дарааллаас дуу хасах')
                .addIntegerOption((opt) =>
                    opt.setName('position').setDescription('Дарааллын байрлал').setRequired(true).setMinValue(1),
                ),
        )
        .addSubcommand((sub) =>
            sub
                .setName('move')
                .setDescription('Дууны дарааллын байрыг өөрчлөх')
                .addIntegerOption((opt) =>
                    opt.setName('from').setDescription('Одоогийн байрлал').setRequired(true).setMinValue(1),
                )
                .addIntegerOption((opt) =>
                    opt.setName('to').setDescription('Шинэ байрлал').setRequired(true).setMinValue(1),
                ),
        )
        .addSubcommand((sub) =>
            sub.setName('clear').setDescription('Дараалал цэвэрлэх'),
        )
        .addSubcommand((sub) =>
            sub.setName('leave').setDescription('Bot-ыг voice сувгаас гаргах'),
        )
        .addSubcommand((sub) =>
            sub
                .setName('247')
                .setDescription('24/7 горим асаах эсвэл унтраах')
                .addBooleanOption((opt) =>
                    opt.setName('enabled').setDescription('24/7 горимын төлөв').setRequired(true),
                ),
        ),

    async execute(interaction, config, client) {
        await deferMusicCommand(interaction);
        const subcommand = interaction.options.getSubcommand();

        switch (subcommand) {
            case 'pause': {
                const embed = await pausePlayback(client, interaction);
                await replyMusicSuccess(interaction, embed);
                break;
            }
            case 'resume': {
                const embed = await resumePlayback(client, interaction);
                await replyMusicSuccess(interaction, embed);
                break;
            }
            case 'skip': {
                const embed = await skipTrack(client, interaction);
                await replyMusicSuccess(interaction, embed);
                break;
            }
            case 'stop': {
                const embed = await stopPlayback(client, interaction);
                await replyMusicSuccess(interaction, embed);
                break;
            }
            case 'shuffle': {
                const embed = await shuffleQueue(client, interaction);
                await replyMusicSuccess(interaction, embed);
                break;
            }
            case 'loop': {
                const embed = await setLoopMode(client, interaction, interaction.options.getString('mode'));
                await replyMusicSuccess(interaction, embed);
                break;
            }
            case 'volume': {
                const embed = await setVolume(client, interaction, interaction.options.getInteger('level'));
                await replyMusicSuccess(interaction, embed);
                break;
            }
            case 'seek': {
                const embed = await seekTrack(client, interaction, interaction.options.getInteger('seconds'));
                await replyMusicSuccess(interaction, embed);
                break;
            }
            case 'remove': {
                const embed = await removeFromQueue(client, interaction, interaction.options.getInteger('position'));
                await replyMusicSuccess(interaction, embed);
                break;
            }
            case 'move': {
                const embed = await moveInQueue(
                    client,
                    interaction,
                    interaction.options.getInteger('from'),
                    interaction.options.getInteger('to'),
                );
                await replyMusicSuccess(interaction, embed);
                break;
            }
            case 'clear': {
                const embed = await clearQueue(client, interaction);
                await replyMusicSuccess(interaction, embed);
                break;
            }
            case 'leave': {
                const embed = await leaveVoiceChannel(client, interaction);
                await replyMusicSuccess(interaction, embed);
                break;
            }
            case '247': {
                const embed = await setTwentyFourSeven(client, interaction, interaction.options.getBoolean('enabled'));
                await replyMusicSuccess(interaction, embed);
                break;
            }
            default:
                await InteractionHelper.safeEditReply(interaction, {
                    content: 'Unknown music subcommand.',
                });
        }
    },
};

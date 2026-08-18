import { Scene, SubtitlePreset, WordTimestamp } from '../../src/types/index';

function formatSrtTime(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const millis = Math.floor((seconds % 1) * 1000);

  return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${millis.toString().padStart(3, '0')}`;
}

function formatVttTime(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const millis = Math.floor((seconds % 1) * 1000);

  return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${millis.toString().padStart(3, '0')}`;
}

function formatAssTime(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const centis = Math.floor((seconds % 1) * 100);

  return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${centis.toString().padStart(2, '0')}`;
}

export class SubtitleEngine {
  // Generate standard SRT format
  public generateSrt(scenes: Scene[]): string {
    let srt = '';
    let index = 1;

    for (const scene of scenes) {
      if (scene.word_timestamps && scene.word_timestamps.length > 0) {
        // Group words into 3-5 word chunks for fast-paced TikTok reading rhythm
        const chunkSize = 4;
        for (let i = 0; i < scene.word_timestamps.length; i += chunkSize) {
          const chunk = scene.word_timestamps.slice(i, i + chunkSize);
          const startTime = scene.start_time + chunk[0].start;
          const endTime = scene.start_time + chunk[chunk.length - 1].end;
          const text = chunk.map(w => w.word).join(' ');

          srt += `${index}\n`;
          srt += `${formatSrtTime(startTime)} --> ${formatSrtTime(endTime)}\n`;
          srt += `${text}\n\n`;
          index++;
        }
      } else {
        const text = scene.subtitle_text || scene.narration;
        if (!text) continue;

        srt += `${index}\n`;
        srt += `${formatSrtTime(scene.start_time)} --> ${formatSrtTime(scene.end_time)}\n`;
        srt += `${text}\n\n`;
        index++;
      }
    }

    return srt.trim();
  }

  // Generate WebVTT format
  public generateVtt(scenes: Scene[]): string {
    let vtt = 'WEBVTT\n\n';
    let index = 1;

    for (const scene of scenes) {
      const text = scene.subtitle_text || scene.narration;
      if (!text) continue;

      vtt += `${index}\n`;
      vtt += `${formatVttTime(scene.start_time)} --> ${formatVttTime(scene.end_time)}\n`;
      vtt += `${text}\n\n`;
      index++;
    }

    return vtt;
  }

  // Generate Advanced SubStation Alpha (.ass) format with styling for FFmpeg burn-in
  public generateAss(scenes: Scene[], preset: SubtitlePreset = 'Viral', videoWidth: number = 1080, videoHeight: number = 1920): string {
    // Styling definitions for presets
    let primaryColor = '&H00FFFFFF'; // White
    let secondaryColor = '&H0000FFFF'; // Yellow (for karaoke)
    let outlineColor = '&H00000000'; // Black outline
    let backColor = '&H80000000'; // Semi-transparent black shadow/box
    let fontSize = 72;
    let bold = 1;
    let borderStyle = 1; // 1 = outline + shadow, 3 = opaque box
    let outline = 4;
    let shadow = 2;
    let alignment = 2; // Bottom Center
    let marginV = 360; // Safe zone above TikTok/Reels UI footer

    if (preset === 'Viral') {
      primaryColor = '&H0000FFFF'; // Vibrant TikTok Yellow
      secondaryColor = '&H0000FF00'; // Neon Green highlight
      outlineColor = '&H00000000';
      fontSize = 82;
      bold = 1;
      outline = 6;
      shadow = 4;
      marginV = 380;
    } else if (preset === 'Bold') {
      primaryColor = '&H00FFFFFF';
      outlineColor = '&H00000000';
      borderStyle = 3; // Solid pill/box
      outline = 8;
      fontSize = 76;
      bold = 1;
      marginV = 360;
    } else if (preset === 'Clean') {
      primaryColor = '&H00FFFFFF';
      outlineColor = '&H00111111';
      fontSize = 68;
      bold = 0;
      outline = 3;
      shadow = 1;
      marginV = 340;
    } else if (preset === 'Minimal') {
      primaryColor = '&H00EEEEEE';
      outlineColor = '&H00000000';
      fontSize = 56;
      bold = 0;
      outline = 2;
      shadow = 1;
      marginV = 280;
    } else if (preset === 'Karaoke') {
      primaryColor = '&H00FFFFFF';
      secondaryColor = '&H0000E5FF'; // Gold yellow highlight
      outlineColor = '&H00000000';
      fontSize = 84;
      bold = 1;
      outline = 6;
      shadow = 3;
      marginV = 380;
    } else if (preset === 'Documentary') {
      primaryColor = '&H00F5F5F5';
      outlineColor = '&H00000000';
      fontSize = 62;
      bold = 0;
      outline = 3;
      shadow = 2;
      marginV = 320;
    }

    let ass = `[Script Info]
Title: ShortsForge Auto Subtitles
ScriptType: v4.00+
WrapStyle: 0
ScaledBorderAndShadow: yes
PlayResX: ${videoWidth}
PlayResY: ${videoHeight}

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,${fontSize},${primaryColor},${secondaryColor},${outlineColor},${backColor},${bold},0,0,0,100,100,0,0,${borderStyle},${outline},${shadow},${alignment},60,60,${marginV},1
Style: Highlight,Arial,${fontSize + 4},&H0000FFFF,&H0000FFFF,&H00000000,&H80000000,1,0,0,0,105,105,0,0,1,6,3,${alignment},60,60,${marginV},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

    for (const scene of scenes) {
      if (preset === 'Karaoke' && scene.word_timestamps && scene.word_timestamps.length > 0) {
        // Break into 4-word windows and apply progressive timing
        const words = scene.word_timestamps;
        const chunkSize = 4;
        for (let i = 0; i < words.length; i += chunkSize) {
          const chunk = words.slice(i, i + chunkSize);
          const chunkStart = scene.start_time + chunk[0].start;
          const chunkEnd = scene.start_time + chunk[chunk.length - 1].end;

          // Word-by-word highlighted ASS effect
          const formattedWords = chunk.map(w => {
            const wordDurCentis = Math.max(10, Math.round((w.end - w.start) * 100));
            return `{\\k${wordDurCentis}}${w.word.toUpperCase()}`;
          }).join(' ');

          ass += `Dialogue: 0,${formatAssTime(chunkStart)},${formatAssTime(chunkEnd)},Default,,0,0,0,,${formattedWords}\n`;
        }
      } else {
        const text = (scene.subtitle_text || scene.narration || '').trim();
        if (!text) continue;

        // Split into max 2 lines if longer than 35 characters
        const words = text.split(' ');
        let formattedText = text;
        if (words.length > 6 && text.length > 32) {
          const mid = Math.ceil(words.length / 2);
          formattedText = `${words.slice(0, mid).join(' ')}\\N${words.slice(mid).join(' ')}`;
        }

        ass += `Dialogue: 0,${formatAssTime(scene.start_time)},${formatAssTime(scene.end_time)},Default,,0,0,0,,${formattedText}\n`;
      }
    }

    return ass;
  }
}

export const subtitleEngine = new SubtitleEngine();

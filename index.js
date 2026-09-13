import { DEFAULTS, normalizeSettings, chatStamp, generateOptions, fillInput } from './generator.js';

const KEY = 'reply_options_mvp';
const context = () => globalThis.SillyTavern?.getContext?.();

function mount() {
    if (document.getElementById('reply-options-panel')) return;
    const ctx = context();
    const form = document.querySelector('#send_form');
    if (!ctx || !form) return;
    let settings = normalizeSettings(ctx.extensionSettings?.[KEY] ?? DEFAULTS);
    let busy = false;
    let revision = 0;
    const panel = document.createElement('details');
    panel.id = 'reply-options-panel';
    panel.open = true;
    panel.innerHTML = `<summary>回复选项</summary>
        <div class="ro-controls">
            <button type="button" class="menu_button ro-generate">生成选项</button>
            <label>数量 <select class="ro-count" aria-label="选项数量">${[2,3,4,5,6].map(n => `<option>${n}</option>`).join('')}</select></label>
            <label>最近 <input class="ro-depth" aria-label="最近聊天条数" type="number" min="1" max="40"> 条</label>
            <label>填入方式 <select class="ro-mode" aria-label="填入方式"><option value="append">追加（保留草稿）</option><option value="replace">替换输入框</option></select></label>
        </div>
        <div class="ro-status" role="status" aria-live="polite">点击生成，选择后填入输入框，由你发送。</div>
        <div class="ro-options"></div>`;
    form.before(panel);
    const find = selector => panel.querySelector(selector);
    const generate = find('.ro-generate');
    const status = find('.ro-status');
    const cards = find('.ro-options');
    const count = find('.ro-count');
    const depth = find('.ro-depth');
    const mode = find('.ro-mode');
    count.value = settings.count;
    depth.value = settings.depth;
    mode.value = settings.mode;

    function clear(message = '聊天已更新，请重新生成选项。') {
        revision++;
        cards.replaceChildren();
        status.textContent = message;
    }
    for (const control of [count, depth, mode]) control.addEventListener('change', () => {
        settings = normalizeSettings({ count: count.value, depth: depth.value, mode: mode.value });
        depth.value = settings.depth;
        const current = context();
        if (current?.extensionSettings) {
            current.extensionSettings[KEY] = { ...settings };
            current.saveSettingsDebounced?.();
        }
        if (control !== mode) clear('设置已更新，请重新生成选项。');
    });

    generate.addEventListener('click', async () => {
        if (busy) return;
        busy = true;
        generate.disabled = true;
        generate.textContent = '生成中…';
        clear('正在使用当前模型生成回复选项…');
        const ticket = revision;
        const start = context();
        const stamp = chatStamp(start);
        try {
            const options = await generateOptions(start, settings);
            if (ticket !== revision || stamp !== chatStamp(context())) {
                status.textContent = '聊天或设置已变化，本次结果已丢弃，请重新生成。';
                return;
            }
            for (const [index, text] of options.entries()) {
                const button = document.createElement('button');
                button.type = 'button';
                button.className = 'ro-card';
                button.textContent = text;
                button.setAttribute('aria-label', `选项 ${index + 1}：${text}`);
                button.addEventListener('click', () => {
                    if (ticket !== revision || stamp !== chatStamp(context())) return clear();
                    try {
                        fillInput(text, settings.mode);
                        status.textContent = '已填入输入框，可继续编辑；尚未发送。';
                    } catch (error) { status.textContent = error.message; }
                });
                cards.append(button);
            }
            status.textContent = `已生成 ${options.length} 个选项，点击即可填入。`;
        } catch (error) {
            if (ticket === revision) status.textContent = `生成失败：${error.message || '请检查模型连接后重试。'}`;
        } finally {
            busy = false;
            generate.disabled = false;
            generate.textContent = '重新生成';
        }
    });
    for (const name of ['CHAT_CHANGED', 'MESSAGE_SENT', 'MESSAGE_RECEIVED', 'MESSAGE_EDITED', 'MESSAGE_UPDATED', 'MESSAGE_DELETED', 'MESSAGE_SWIPED', 'PERSONA_CHANGED']) {
        if (ctx.event_types?.[name]) ctx.eventSource?.on(ctx.event_types[name], () => clear());
    }
}

function start() {
    const ctx = context();
    if (ctx?.event_types?.APP_READY) ctx.eventSource?.on(ctx.event_types.APP_READY, mount);
    mount();
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
else start();

# 回复选项 · Reply Options 0.1.0

SillyTavern 前端扩展最小可用版。点击“生成选项”，根据最近聊天生成 2–6 个回复卡片；点击卡片，将文字填入聊天输入框，再由用户编辑、发送。

## 安装

推荐：在酒馆“扩展 → 安装扩展”中粘贴仓库地址：

https://github.com/agentgeleven-lab/sillytavern-reply-options

安装后刷新页面。也可以使用以下手动安装方法：

1. 解压发布包，将整个 `reply-options` 文件夹放入酒馆安装目录下的 `data/<用户标识>/extensions/`。默认用户通常为 `default-user`。
2. 确认结构为 `data/default-user/extensions/reply-options/manifest.json`，避免套两层同名目录。
3. 刷新酒馆页面，在扩展管理中确认“回复选项 · Reply Options”已启用。
4. 打开聊天并配置可正常生成回复的模型连接，输入框上方会出现“回复选项”面板。

开发环境也可放在 `public/scripts/extensions/third-party/reply-options/`。二选一，避免重复加载。TauriTavern 等兼容前端应放入其实际用户数据目录下的 `extensions`，不要照搬程序目录路径。

使用 GitHub 的 Download ZIP 时，将解压目录重命名为 `reply-options` 后手动安装；不要把 ZIP 路径粘贴到仓库 URL 栏。无须构建、额外服务或单独填写 API 密钥。

## 使用

- 默认 3 个选项，取最近 12 条非系统文本消息；可设 2–6 个、最近 1–40 条。
- 点击“生成选项”或“重新生成”。每次点击会通过当前酒馆模型连接发起一次生成请求。
- 点击卡片默认追加到现有草稿末尾；“替换输入框”模式会覆盖草稿。
- 点击面板标题可折叠。数量、上下文条数、填入方式保存在酒馆扩展设置中。
- 聊天切换、消息修改等会清空旧选项；请求期间聊天变化会丢弃结果。
- 模型输出无效时显示错误，可再次生成，不会自动循环重试。

## 文件与接口

| 文件 / 接口 | 职责 |
| --- | --- |
| manifest.json | 酒馆扩展入口及样式声明 |
| index.js | 面板、设置、生成状态、会话变化处理及卡片点击 |
| style.css | 局部主题样式，支持窄屏换行 |
| generator.js / collectContext(ctx, settings) | 复制最近非系统聊天文本，返回用户名称及 history |
| generator.js / generateOptions(ctx, settings) | 调用 `ctx.generateRaw({systemPrompt, prompt, responseLength, trimNames})`，返回 `Promise<string[]>` |
| generator.js / parseOptions(raw, count) | 解析 `{"options":["选项一","选项二"]}` 或字符串数组；过滤空项、异常类型及重复项 |
| generator.js / fillInput(text, mode, document) | 写入 `#send_textarea` 并触发 input 事件及聚焦 |

获取宿主状态统一使用 `SillyTavern.getContext()`；不直接导入宿主内部路径，不读写密钥，不添加聊天消息。模型结果使用 `textContent` 渲染。填入流程没有调用发送接口、执行斜杠命令或模拟回车。

如需接入独立服务，替换 `generateOptions` 内部调用并保持 `Promise<string[]>` 返回契约即可；当前版本未提供独立服务地址设置。

## 上下文范围与兼容性

采用 raw 生成，只显式传入最近聊天的用户名称、发言者及消息文本。每条最多保留末尾 4000 字符，总消息文本最多 24000 字符，以最新内容优先。这是字符上限而非 token 上限；小上下文模型可减少条数。

首版不额外加载完整角色卡、世界书、图片、工具消息附件或用户人设描述。群聊保留每条消息的发言者名称。模型遵循格式及内容的能力影响结果质量；不足指定数量但至少有 2 条有效选项时，显示实际数量。

需要宿主提供 `generateRaw` 对象参数接口及标准的 `#send_form` / `#send_textarea`。设置持久化依赖 `extensionSettings` 和 `saveSettingsDebounced`。不满足条件的旧版或改版前端可能需要适配。

请求进行中禁止本面板重复请求。首版不提供中断模型请求功能，也不锁定宿主聊天操作；建议等待模型完成后再开始其他生成。会话发生变化时只丢弃返回结果，底层请求可能继续完成。

## 验证与卸载

已提供源码语法检查和模拟宿主测试，覆盖上下文截取、输出解析、保留草稿、仅触发 input、切换聊天丢弃旧请求、异常恢复及重新生成。此验证不能替代真实酒馆加载与真实模型联调；当前未在用户运行中的酒馆安装或调用模型。

实机验收：打开聊天 → 生成选项 → 在输入框先写草稿 → 点击选项 → 确认追加且聊天记录未增加 → 手动发送。再检查切换聊天、模型断连及重新生成。

卸载时在扩展管理中禁用或删除本扩展并刷新页面。扩展不修改已有聊天或其他扩展文件。

接口依据：[SillyTavern 官方扩展文档](https://docs.sillytavern.app/for-contributors/writing-extensions/)。

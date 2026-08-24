// SerialLinkModule.cpp — SerialLinkModule.h の実装
#include "SerialLinkModule.h"

#include <Arduino.h>   // pinMode / digitalRead / Serial などの Arduino API

#include <string.h>

bool SerialLinkModule::init() {
    // Serial.begin() はここでは呼ばない（main.cpp の setup() が開く共有資源）
    _sendTimer.setInterval(_config.sendMs);
    _len = 0;
    return true;
}

void SerialLinkModule::updateInput(SystemData& data) {
    // 「届いたのは今回のループだけ」にするため、毎回falseへ戻す
    data.link.commandReceived = false;

    // 受信バッファに溜まっている分だけ読む（待たない = ブロックしない）
    while (Serial.available() > 0) {
        const char c = (char)Serial.read();

        if (c == '\n' || c == '\r') {
            if (_len > 0) {
                _buf[_len] = '\0';
                strncpy(data.link.command, _buf, SERIAL_LINK_BUF_SIZE - 1);
                data.link.command[SERIAL_LINK_BUF_SIZE - 1] = '\0';
                data.link.commandReceived = true;
                _len = 0;
            }
            continue;
        }

        // バッファがあふれたら、その行は捨てる（暴走を防ぐ）
        if (_len < SERIAL_LINK_BUF_SIZE - 1) {
            _buf[_len++] = c;
        } else {
            _len = 0;
        }
    }
}

void SerialLinkModule::updateOutput(SystemData& data) {
    if (_config.sendMs == 0) return;
    if (!_sendTimer.isElapsed()) return;

    // 決めたフォーマットで 1 行送る。
    // 受け取る側と形式を合わせること（docs/design/interfaces.md に書く）。
    Serial.print("STATUS,");
    Serial.println(data.link.statusValue);
}

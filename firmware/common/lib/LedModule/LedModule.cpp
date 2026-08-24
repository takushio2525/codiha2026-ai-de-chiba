// LedModule.cpp — LedModule.h の実装
#include "LedModule.h"

#include <Arduino.h>   // pinMode / digitalRead / Serial などの Arduino API

bool LedModule::init() {
    pinMode(_config.pin, OUTPUT);
    digitalWrite(_config.pin, LOW);
    _timer.setInterval(_config.blinkMs);
    return true;   // ピン設定は失敗しないので常に成功
}

void LedModule::updateOutput(SystemData& data) {
    switch (data.led.mode) {
        case LedData::OFF:
            _lit = false;
            break;
        case LedData::ON:
            _lit = true;
            break;
        case LedData::BLINK:
            // 周期が来たときだけ反転する（delay() は使わない）
            if (_timer.isElapsed()) _lit = !_lit;
            break;
    }
    digitalWrite(_config.pin, _lit ? HIGH : LOW);
}

// ButtonModule.cpp — ButtonModule.h の実装
#include "ButtonModule.h"

#include <Arduino.h>   // pinMode / digitalRead / Serial などの Arduino API

bool ButtonModule::init() {
    pinMode(_config.pin, _config.activeLow ? INPUT_PULLUP : INPUT);
    return true;
}

void ButtonModule::updateInput(SystemData& data) {
    const bool raw = (digitalRead(_config.pin) == HIGH);
    const bool pressed = _config.activeLow ? !raw : raw;

    data.button.pressed = pressed;
    data.button.justPressed = (pressed && !_prevPressed);
    _prevPressed = pressed;
}

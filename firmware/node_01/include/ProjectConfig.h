// ProjectConfig.h — このノード（node_01）のピン番号と設定値を 1 か所に集める
//
// 「マジックナンバーをコードに散らかさない」ためのファイル。
// 配線を変えたときに直す場所がここだけで済む。
#pragma once

#include "ButtonModule.h"
#include "LedModule.h"
#include "SerialLinkModule.h"

// ===== 共有資源の設定（main.cpp の setup() で開くもの）=====
// Serial や I2C / SPI は複数のモジュールが同時に使う。
// 誰か 1 人（= main.cpp）が開く、と決めておかないと二重初期化で壊れる。
constexpr unsigned long SERIAL_BAUDRATE = 115200;   // PC 側と必ず合わせる

// ===== ピン定義 =====
// 実際に配線したピン番号に書き換える
constexpr int BUTTON_PIN = 2;
constexpr int LED_PIN    = 13;   // 多くのボードで内蔵 LED

// ===== 各モジュールの設定 =====
constexpr ButtonConfig BUTTON_CONFIG = {
    .pin = BUTTON_PIN,
    .activeLow = true,      // INPUT_PULLUP 配線（押すと LOW）
};

constexpr LedConfig LED_CONFIG = {
    .pin = LED_PIN,
    .blinkMs = 250,         // 点滅モードの周期
};

constexpr SerialLinkConfig SERIAL_LINK_CONFIG = {
    .sendMs = 100,          // 100ms ごとに状態を 1 行送る（0 で周期送信オフ）
};

// ===== ロジックで使う閾値 =====
// マジックナンバーを applyPattern() の中に直接書かず、ここに集めておく
constexpr int LONG_PRESS_LOOPS = 200;   // 押しっぱなしと判定するループ回数

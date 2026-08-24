// ModuleTimer.h — 「一定周期で何かをする」を delay() なしで書くための小道具
//
// delay() を使うと他のモジュールまで止まってしまう。EMA では loop() が
// 高速に回り続ける前提なので，周期処理はこのタイマで書く。
//
// 使い方:
//   ModuleTimer timer;
//   timer.setInterval(500);          // 500ms 周期
//   if (timer.isElapsed()) { ... }   // 500ms 経つたびに 1 回だけ true
#pragma once

#include <Arduino.h>

class ModuleTimer {
public:
    ModuleTimer() : _intervalMs(0), _lastMs(0) {}

    // 周期(ms)を設定する。設定した時点を起点にする。
    void setInterval(unsigned long intervalMs) {
        _intervalMs = intervalMs;
        _lastMs = millis();
    }

    // 周期が経過していれば true を返し，起点を進める。
    // 経過していなければ false。毎ループ呼んでよい。
    bool isElapsed() {
        if (_intervalMs == 0) return false;
        const unsigned long now = millis();
        // 引き算で比較すると millis() の桁あふれ（約 49 日）でも正しく動く
        if (now - _lastMs < _intervalMs) return false;
        _lastMs += _intervalMs;
        return true;
    }

    // 起点を「今」にリセットする
    void reset() { _lastMs = millis(); }

private:
    unsigned long _intervalMs;
    unsigned long _lastMs;
};

// SerialCore.pde — 複数スケッチで共有する部品のサンプル（受信まわり）
//
// このファイルは pc_app/common/ に「正本」を置き、各スケッチには
// sync_common.py でコピーして配る。編集するときは必ず common/ 側を直すこと。
//
// 受け取る形式は firmware 側と合わせる:
//     STATUS,<整数>\n
// 形式を変えるときは docs/design/interfaces.md を先に更新して PR を出す。

import processing.serial.*;

class SerialCore {
  Serial port;
  String lastLine = "";
  int    lastValue = 0;
  int    receivedCount = 0;
  boolean connected = false;

  // 使えるポートの一覧を表示する（どれを指定すればいいか分からないとき用）
  static void printPorts(PApplet app) {
    println("--- 使えるシリアルポート ---");
    String[] list = Serial.list();
    if (list.length == 0) {
      println("見つかりません。USB ケーブルとドライバを確認してください。");
    }
    for (int i = 0; i < list.length; i++) {
      println("  [" + i + "] " + list[i]);
    }
  }

  // 接続する。失敗しても例外で落とさず false を返す
  // （スケッチが起動しないと原因が分からなくなるため）
  boolean connect(PApplet app, String portName, int baud) {
    try {
      port = new Serial(app, portName, baud);
      port.bufferUntil('\n');
      connected = true;
      println("接続しました: " + portName + " @ " + baud + "bps");
    } catch (Exception e) {
      connected = false;
      println("接続できませんでした: " + e.getMessage());
      println("printPorts() でポート名を確認し、シリアルモニタを閉じてください。");
    }
    return connected;
  }

  // Processing の serialEvent() から呼ぶ
  void onLine(String raw) {
    if (raw == null) return;
    String line = trim(raw);
    if (line.length() == 0) return;

    lastLine = line;
    receivedCount++;

    // "STATUS,123" を分解する
    String[] parts = split(line, ',');
    if (parts.length >= 2 && parts[0].equals("STATUS")) {
      try {
        lastValue = int(parts[1]);
      } catch (Exception e) {
        // 数値でなければ無視する（通信の途中で化けることがある）
      }
    }
  }
}

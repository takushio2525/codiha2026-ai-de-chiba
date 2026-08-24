// example_viewer.pde — マイコンから届いた値を可視化するサンプル
//
// firmware/node_01 のサンプルが 100ms ごとに送る "STATUS,<値>" を受け取り、
// 折れ線グラフにする。テンプレート全体を通した「つなぎ目」の実例。
//
// 【使い方】
//   1. PORT_NAME を自分の環境に合わせて書き換える
//      （分からなければ実行してコンソールに出るポート一覧を見る）
//   2. マイコンを USB でつなぐ
//   3. Run を押す
//
// 共通部品 SerialCore.pde は pc_app/common/ が正本。
// このフォルダのコピーを直接編集しないこと（sync_common.py で上書きされる）。

// ===== 設定 =====
final String PORT_NAME = "";      // 例: "/dev/tty.usbmodem1101" / "COM3"
final int    BAUD_RATE = 115200;  // firmware 側と必ず合わせる
final int    HISTORY   = 200;     // グラフに残す点の数

SerialCore link;
int[] history = new int[HISTORY];
int   writeIndex = 0;

void setup() {
  size(640, 360);
  link = new SerialCore();

  SerialCore.printPorts(this);

  if (PORT_NAME.length() == 0) {
    println("PORT_NAME が空です。上のポート一覧から選んで書き換えてください。");
  } else {
    link.connect(this, PORT_NAME, BAUD_RATE);
  }
}

// Processing がシリアルの 1 行を受け取ると自動で呼ぶ
void serialEvent(Serial p) {
  link.onLine(p.readStringUntil('\n'));
  history[writeIndex] = link.lastValue;
  writeIndex = (writeIndex + 1) % HISTORY;
}

void draw() {
  background(20);

  // --- 状態表示 ---
  fill(255);
  textSize(14);
  text(link.connected ? "接続中: " + PORT_NAME : "未接続（PORT_NAME を設定してください）", 12, 24);
  text("受信: " + link.receivedCount + " 行   最新: " + link.lastLine, 12, 44);

  // --- 折れ線グラフ ---
  stroke(120, 220, 160);
  noFill();
  beginShape();
  for (int i = 0; i < HISTORY; i++) {
    int idx = (writeIndex + i) % HISTORY;   // 古い順に読む
    float x = map(i, 0, HISTORY - 1, 12, width - 12);
    float y = map(history[idx], 0, 10, height - 24, 80);  // 値域は実データに合わせる
    vertex(x, y);
  }
  endShape();
}

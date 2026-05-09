import { type CSSProperties, type FormEvent, useEffect, useState } from "react";
import {
  getWallet,
  getWalletTransactions,
  topUpWallet,
  type WalletTransactionRecord,
} from "../services/firebase/walletService";
import {
  getReceiptById,
  type DigitalReceipt,
} from "../services/firebase/receiptService";

interface WalletPanelProps {
  userId: string;
}

const styles: Record<string, CSSProperties> = {
  panel: {
    borderRadius: "22px",
    border: "1px solid #DCE8DF",
    backgroundColor: "#FFFFFF",
    padding: "18px",
    boxShadow: "0 12px 28px rgba(31,94,77,0.06)",
    marginBottom: "16px",
  },
  top: {
    display: "grid",
    gridTemplateColumns: "1fr auto",
    gap: "14px",
    alignItems: "start",
  },
  label: {
    color: "#7A8982",
    fontSize: "11px",
    fontWeight: 850,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
  },
  balance: {
    marginTop: "6px",
    color: "#17231F",
    fontSize: "28px",
    fontWeight: 950,
  },
  form: {
    display: "flex",
    gap: "10px",
    alignItems: "center",
  },
  input: {
    width: "130px",
    minHeight: "44px",
    padding: "10px 12px",
    border: "1px solid #D8E2DB",
    borderRadius: "14px",
    fontSize: "14px",
    boxSizing: "border-box",
    outline: "none",
    backgroundColor: "#FBFDFB",
    color: "#17231F",
    fontFamily: "inherit",
  },
  primaryButton: {
    minHeight: "44px",
    padding: "10px 14px",
    background: "linear-gradient(135deg, #173C34 0%, #24705B 100%)",
    border: "none",
    borderRadius: "14px",
    color: "#FFFFFF",
    fontSize: "13px",
    fontWeight: 850,
    cursor: "pointer",
    fontFamily: "inherit",
  },
  secondaryButton: {
    minHeight: "38px",
    padding: "8px 12px",
    backgroundColor: "#FFFFFF",
    border: "1px solid #AFCDBB",
    borderRadius: "12px",
    color: "#1F5E4D",
    fontSize: "12px",
    fontWeight: 850,
    cursor: "pointer",
    fontFamily: "inherit",
  },
  message: {
    marginTop: "12px",
    padding: "12px 14px",
    borderRadius: "14px",
    fontSize: "13px",
    lineHeight: 1.55,
  },
  success: {
    backgroundColor: "#EFF8E7",
    border: "1px solid #BFDE9B",
    color: "#2C6642",
  },
  error: {
    backgroundColor: "#FFF3F1",
    border: "1px solid #F4B8AE",
    color: "#A63E30",
  },
  historyTitle: {
    margin: "18px 0 10px",
    color: "#17231F",
    fontSize: "16px",
    fontWeight: 900,
  },
  list: {
    display: "grid",
    gap: "10px",
  },
  row: {
    display: "grid",
    gridTemplateColumns: "1fr auto",
    gap: "12px",
    alignItems: "center",
    borderRadius: "16px",
    border: "1px solid #DCE8DF",
    backgroundColor: "#F7FBF7",
    padding: "12px",
  },
  rowTitle: {
    margin: 0,
    color: "#17231F",
    fontSize: "14px",
    fontWeight: 900,
    textTransform: "capitalize",
  },
  rowMeta: {
    marginTop: "5px",
    color: "#66756E",
    fontSize: "12px",
    lineHeight: 1.45,
    fontWeight: 700,
  },
  amount: {
    color: "#1F5E4D",
    fontSize: "14px",
    fontWeight: 950,
    textAlign: "right",
  },
  receipt: {
    marginTop: "12px",
    borderRadius: "16px",
    border: "1px solid #D8E2DB",
    backgroundColor: "#FBFDFB",
    padding: "14px",
  },
  receiptGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "10px",
    marginTop: "10px",
  },
  receiptItem: {
    borderRadius: "12px",
    backgroundColor: "#FFFFFF",
    border: "1px solid #DCE8DF",
    padding: "10px",
  },
  receiptValue: {
    marginTop: "5px",
    color: "#17231F",
    fontSize: "13px",
    fontWeight: 850,
    overflowWrap: "anywhere",
  },
};

function formatDate(createdAt: unknown) {
  const date = (createdAt as { toDate?: () => Date } | undefined)?.toDate?.();
  if (!date) return "--";

  return `${String(date.getDate()).padStart(2, "0")}.${String(
    date.getMonth() + 1,
  ).padStart(2, "0")}.${date.getFullYear()} ${String(date.getHours()).padStart(
    2,
    "0",
  )}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function formatAmount(amount: number, type: WalletTransactionRecord["type"]) {
  const prefix = type === "payment" ? "-" : "+";
  return `${prefix}${Number(amount).toFixed(2)} TL`;
}

function WalletPanel({ userId }: WalletPanelProps) {
  const [balance, setBalance] = useState<number>(0);
  const [transactions, setTransactions] = useState<WalletTransactionRecord[]>([]);
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [selectedReceipt, setSelectedReceipt] = useState<DigitalReceipt | null>(
    null,
  );
  const [receiptError, setReceiptError] = useState("");

  const loadWallet = async () => {
    setLoading(true);
    setError("");

    try {
      const [wallet, walletTransactions] = await Promise.all([
        getWallet(userId),
        getWalletTransactions(userId),
      ]);
      setBalance(wallet.balance);
      setTransactions(walletTransactions);
    } catch {
      setError("Wallet bilgileri alinamadi. Lutfen tekrar deneyin.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadWallet();
  }, [userId]);

  const handleTopUp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");
    setError("");
    setSelectedReceipt(null);

    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError("Yuklenecek bakiye sifirdan buyuk olmalidir.");
      return;
    }

    try {
      setSaving(true);
      await topUpWallet(userId, parsedAmount);
      setAmount("");
      setMessage("Bakiye yuklendi.");
      await loadWallet();
    } catch {
      setError("Bakiye yuklenemedi. Lutfen tekrar deneyin.");
    } finally {
      setSaving(false);
    }
  };

  const handleViewReceipt = async (receiptId: string) => {
    setReceiptError("");
    setSelectedReceipt(null);

    try {
      const receipt = await getReceiptById(receiptId);
      if (!receipt) {
        setReceiptError("Receipt bulunamadi.");
        return;
      }

      setSelectedReceipt(receipt);
    } catch {
      setReceiptError("Receipt detayi alinamadi.");
    }
  };

  return (
    <section style={styles.panel} aria-label="Wallet">
      <div style={styles.top}>
        <div>
          <div style={styles.label}>Wallet Balance</div>
          <div style={styles.balance}>
            {loading ? "..." : `${balance.toFixed(2)} TL`}
          </div>
        </div>

        <form style={styles.form} onSubmit={handleTopUp}>
          <input
            type="number"
            min="1"
            step="0.01"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="Amount"
            style={styles.input}
            disabled={saving}
          />
          <button type="submit" style={styles.primaryButton} disabled={saving}>
            {saving ? "Yukleniyor..." : "Add Balance"}
          </button>
        </form>
      </div>

      {message && <div style={{ ...styles.message, ...styles.success }}>{message}</div>}
      {error && <div style={{ ...styles.message, ...styles.error }}>{error}</div>}

      <h3 style={styles.historyTitle}>Transaction History</h3>
      <div style={styles.list}>
        {!loading && transactions.length === 0 && (
          <div style={{ ...styles.message, ...styles.success }}>
            Henuz wallet islemi yok.
          </div>
        )}

        {transactions.map((transaction) => (
          <article key={transaction.id} style={styles.row}>
            <div>
              <p style={styles.rowTitle}>{transaction.type}</p>
              <div style={styles.rowMeta}>
                {formatDate(transaction.createdAt)} - {transaction.paymentStatus}
                {transaction.energyConsumed != null
                  ? ` - ${Number(transaction.energyConsumed).toFixed(2)} kWh`
                  : ""}
              </div>
              <button
                type="button"
                style={{ ...styles.secondaryButton, marginTop: "8px" }}
                onClick={() => void handleViewReceipt(transaction.receiptId)}
              >
                Receipt Detail
              </button>
            </div>
            <div style={styles.amount}>
              {formatAmount(transaction.amount, transaction.type)}
              <div style={styles.rowMeta}>
                Bakiye: {Number(transaction.balanceAfter).toFixed(2)} TL
              </div>
            </div>
          </article>
        ))}
      </div>

      {receiptError && (
        <div style={{ ...styles.message, ...styles.error }}>{receiptError}</div>
      )}

      {selectedReceipt && (
        <div style={styles.receipt}>
          <div style={styles.label}>Digital Receipt</div>
          <div style={styles.receiptGrid}>
            <div style={styles.receiptItem}>
              <div style={styles.label}>userId</div>
              <div style={styles.receiptValue}>{selectedReceipt.userId}</div>
            </div>
            <div style={styles.receiptItem}>
              <div style={styles.label}>stationId</div>
              <div style={styles.receiptValue}>
                {selectedReceipt.stationId ?? "--"}
              </div>
            </div>
            <div style={styles.receiptItem}>
              <div style={styles.label}>chargerId</div>
              <div style={styles.receiptValue}>
                {selectedReceipt.chargerId ?? "--"}
              </div>
            </div>
            <div style={styles.receiptItem}>
              <div style={styles.label}>amount</div>
              <div style={styles.receiptValue}>
                {Number(selectedReceipt.amount).toFixed(2)} TL
              </div>
            </div>
            <div style={styles.receiptItem}>
              <div style={styles.label}>energyConsumed</div>
              <div style={styles.receiptValue}>
                {selectedReceipt.energyConsumed == null
                  ? "--"
                  : `${Number(selectedReceipt.energyConsumed).toFixed(2)} kWh`}
              </div>
            </div>
            <div style={styles.receiptItem}>
              <div style={styles.label}>transactionType</div>
              <div style={styles.receiptValue}>
                {selectedReceipt.transactionType}
              </div>
            </div>
            <div style={styles.receiptItem}>
              <div style={styles.label}>paymentStatus</div>
              <div style={styles.receiptValue}>{selectedReceipt.paymentStatus}</div>
            </div>
            <div style={styles.receiptItem}>
              <div style={styles.label}>createdAt</div>
              <div style={styles.receiptValue}>
                {formatDate(selectedReceipt.createdAt)}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default WalletPanel;

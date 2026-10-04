import Sale from "../models/Sale.js";

class FPNode {
  constructor(item, count, parent) {
    this.item = item;
    this.count = count;
    this.parent = parent;
    this.children = new Map();
    this.link = null;
  }

  increment(count = 1) {
    this.count += count;
  }
}

function buildHeaderTable(transactions, minSupportCount) {
  const itemCounts = new Map();

  for (const transaction of transactions) {
    const uniqueItems = [...new Set(transaction)];
    for (const item of uniqueItems) {
      itemCounts.set(item, (itemCounts.get(item) || 0) + 1);
    }
  }

  const headerTable = new Map();
  for (const [item, count] of itemCounts.entries()) {
    if (count >= minSupportCount) {
      headerTable.set(item, { count, head: null });
    }
  }

  return headerTable;
}

function sortTransaction(transaction, headerTable) {
  return [...new Set(transaction)]
    .filter((item) => headerTable.has(item))
    .sort((a, b) => {
      const countDiff = headerTable.get(b).count - headerTable.get(a).count;
      if (countDiff !== 0) return countDiff;
      return a.localeCompare(b);
    });
}

function insertTransaction(items, root, headerTable, count = 1) {
  let currentNode = root;

  for (const item of items) {
    let childNode = currentNode.children.get(item);

    if (childNode) {
      childNode.increment(count);
    } else {
      childNode = new FPNode(item, count, currentNode);
      currentNode.children.set(item, childNode);

      const header = headerTable.get(item);
      if (!header.head) {
        header.head = childNode;
      } else {
        let node = header.head;
        while (node.link) node = node.link;
        node.link = childNode;
      }
    }

    currentNode = childNode;
  }
}

function buildFPTree(transactions, minSupportCount) {
  const headerTable = buildHeaderTable(transactions, minSupportCount);

  if (headerTable.size === 0) {
    return { root: null, headerTable };
  }

  const root = new FPNode(null, 0, null);

  for (const transaction of transactions) {
    const sortedItems = sortTransaction(transaction, headerTable);
    if (sortedItems.length > 0) {
      insertTransaction(sortedItems, root, headerTable);
    }
  }

  return { root, headerTable };
}

function getPrefixPaths(item, headerTable) {
  const paths = [];
  let node = headerTable.get(item)?.head;

  while (node) {
    const path = [];
    let parent = node.parent;

    while (parent && parent.item !== null) {
      path.unshift(parent.item);
      parent = parent.parent;
    }

    if (path.length > 0) {
      paths.push({ path, count: node.count });
    }

    node = node.link;
  }

  return paths;
}

function expandConditionalTransactions(prefixPaths) {
  const transactions = [];
  for (const { path, count } of prefixPaths) {
    for (let i = 0; i < count; i++) {
      transactions.push(path);
    }
  }
  return transactions;
}

function mineFPTree(headerTable, minSupportCount, prefix = [], frequentItemsets = []) {
  const sortedItems = [...headerTable.entries()].sort((a, b) => a[1].count - b[1].count);

  for (const [item, data] of sortedItems) {
    const newItemset = [...prefix, item];

    frequentItemsets.push({ items: newItemset, supportCount: data.count });

    const prefixPaths = getPrefixPaths(item, headerTable);
    const conditionalTransactions = expandConditionalTransactions(prefixPaths);

    if (conditionalTransactions.length === 0) continue;

    const { headerTable: conditionalHeaderTable } = buildFPTree(
      conditionalTransactions,
      minSupportCount,
    );

    if (conditionalHeaderTable.size > 0) {
      mineFPTree(conditionalHeaderTable, minSupportCount, newItemset, frequentItemsets);
    }
  }

  return frequentItemsets;
}

function runFPGrowth(transactions, minSupportCount) {
  const { headerTable } = buildFPTree(transactions, minSupportCount);
  if (headerTable.size === 0) return [];
  return mineFPTree(headerTable, minSupportCount);
}

export async function getFPGrowthAnalysis(req, res) {
  try {
    const minSupport = Number(req.query.minSupport || 0.05);

    if (minSupport <= 0 || minSupport > 1) {
      return res.status(400).json({
        success: false,
        message: "minSupport must be between 0 and 1",
      });
    }

    const rows = await Sale.aggregate([
      { $unwind: "$items" },
      { $match: { "items.productName": { $ne: null } } },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, sale_id: "$_id", product_name: "$items.productName" } },
    ]);

    if (rows.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No sales data found",
        data: {
          totalTransactions: 0,
          minSupport,
          minSupportCount: 0,
          frequentItemsets: [],
          bundleSuggestions: [],
        },
      });
    }

    const transactionMap = new Map();
    for (const row of rows) {
      const key = String(row.sale_id);
      if (!transactionMap.has(key)) transactionMap.set(key, []);
      transactionMap.get(key).push(row.product_name);
    }

    const transactions = [...transactionMap.values()].filter((t) => t.length > 0);
    const totalTransactions = transactions.length;
    const minSupportCount = Math.ceil(totalTransactions * minSupport);

    const frequentItemsets = runFPGrowth(transactions, minSupportCount)
      .map((itemset) => ({
        items: itemset.items,
        itemCount: itemset.items.length,
        supportCount: itemset.supportCount,
        supportPercentage: Number(((itemset.supportCount / totalTransactions) * 100).toFixed(2)),
      }))
      .sort((a, b) => {
        if (b.itemCount !== a.itemCount) return b.itemCount - a.itemCount;
        return b.supportCount - a.supportCount;
      });

    const bundleSuggestions = frequentItemsets
      .filter((itemset) => itemset.itemCount >= 2)
      .map((itemset) => ({
        products: itemset.items,
        supportCount: itemset.supportCount,
        supportPercentage: itemset.supportPercentage,
        suggestion: `Customers often buy ${itemset.items.join(" + ")} together.`,
      }));

    return res.status(200).json({
      success: true,
      message: "FP-Growth analysis completed successfully",
      data: {
        totalTransactions,
        minSupport,
        minSupportCount,
        frequentItemsets,
        bundleSuggestions,
      },
    });
  } catch (error) {
    console.error("Error in getFPGrowthAnalysis:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to perform FP-Growth analysis",
      error: error.message,
    });
  }
}

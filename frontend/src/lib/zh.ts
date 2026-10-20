import { zhModals1 } from "./zh-modals/m1";
import { zhModals2 } from "./zh-modals/m2";
import { zhModals3 } from "./zh-modals/m3";
import { zhModals4 } from "./zh-modals/m4";
import { zhModals5 } from "./zh-modals/m5";
import { zhPages1 } from "./zh-pages/p1";
import { zhPages2 } from "./zh-pages/p2";
import { zhPages3 } from "./zh-pages/p3";
import { zhPages4 } from "./zh-pages/p4";
import { zhPages5 } from "./zh-pages/p5";
import { zhPages6 } from "./zh-pages/p6";
import { zhPages7 } from "./zh-pages/p7";
import { zhPages8 } from "./zh-pages/p8";
import { zhFixes } from "./zh-fixes";
import { zhLoading1 } from "./zh-loading/l1";
import { zhLoading2 } from "./zh-loading/l2";
import { zhLoading3 } from "./zh-loading/l3";
import { zhLoading4 } from "./zh-loading/l4";
import { zhLoading5 } from "./zh-loading/l5";
import { zhLoading6 } from "./zh-loading/l6";
import { zhLoading7 } from "./zh-loading/l7";

// English text -> Chinese. Anything missing here simply stays in English, so
// screens can be translated one at a time by wrapping their text in t().
const base: Record<string, string> = {
  // shell
  "Ting Ting ko pasal": "Ting Ting ko pasal",
  "Open menu": "打开菜单",
  "Log out": "退出登录",
  Language: "语言",

  // sidebar
  Overview: "概览",
  Billing: "收银",
  Inventory: "库存",
  Finance: "财务",
  Settings: "设置",
  Dashboard: "仪表盘",
  POS: "收银台",
  Sales: "销售",
  Products: "商品",
  Categories: "分类",
  "Product Batches": "商品批次",
  "Barcode Labels": "条码标签",
  "Inventory Transactions": "库存流水",
  "Reorder Planning (EOQ)": "补货计划 (EOQ)",
  Expenses: "支出",
  Daybook: "日记账",
  "Activity Log": "操作日志",
  "Payment Methods": "支付方式",
  Security: "安全",
  "Store Profile": "店铺资料",

  // categories
  "Manage product categories for your business.": "管理您店铺的商品分类。",
  "Add Category": "添加分类",
  "Total Categories": "分类总数",
  "All product categories": "所有商品分类",
  "With Description": "有描述",
  "Categories that have descriptions": "带有描述的分类",
  "New This Week": "本周新增",
  "Added in last 7 days": "近 7 天新增",
  "Search categories by name or description...": "按名称或描述搜索分类...",
  "All Categories": "全部分类",
  "total records": "条记录",
  SN: "序号",
  Thumbnail: "缩略图",
  "Category Name": "分类名称",
  Description: "描述",
  Created: "创建时间",
  "Last Updated": "最后更新",
  Actions: "操作",
  "Loading categories...": "正在加载分类...",
  "No categories found": "未找到分类",
  "Try adjusting your search terms": "请尝试调整搜索关键词",
  "Add your first category to organize products": "添加第一个分类来整理商品",
  "No description": "无描述",
  "Edit category": "编辑分类",
  "Delete category": "删除分类",
  "Category deleted successfully": "分类已删除",
  "Failed to delete category": "删除分类失败",
  "Edit Category": "编辑分类",
  "Add New Category": "添加新分类",
  "Update the category details below.": "请在下方更新分类信息。",
  "Fill in the details to create a new category.": "填写信息以创建新分类。",
  "Category Name *": "分类名称 *",
  "e.g., Electronics, Clothing, Furniture": "例如：电子产品、服装、家具",
  "Enter a brief description of this category (optional)":
    "请输入该分类的简短描述（可选）",
  "Shown on the customer site's category menu.": "显示在顾客网站的分类菜单中。",
  Remove: "移除",
  Cancel: "取消",
  "Saving...": "保存中...",
  "Update Category": "更新分类",
  "Create Category": "创建分类",
  "Category name is required": "请输入分类名称",
  "Category updated successfully": "分类已更新",
  "Category created successfully": "分类已创建",
  "Failed to update category": "更新分类失败",
  "Failed to create category": "创建分类失败",
  "Category saved, but the thumbnail upload failed":
    "分类已保存，但缩略图上传失败",
};

export const zh: Record<string, string> = {
  ...base,
  ...zhModals1,
  ...zhModals2,
  ...zhModals3,
  ...zhModals4,
  ...zhModals5,
  ...zhPages1,
  ...zhPages2,
  ...zhPages3,
  ...zhPages4,
  ...zhPages5,
  ...zhPages6,
  ...zhPages7,
  ...zhPages8,
  ...zhLoading1,
  ...zhLoading2,
  ...zhLoading3,
  ...zhLoading4,
  ...zhLoading5,
  ...zhLoading6,
  ...zhLoading7,
  ...zhFixes,
};

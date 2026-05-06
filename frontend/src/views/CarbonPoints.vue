<template>
  <div class="page-container">
    <div class="eco-dashboard">
      <div class="eco-dashboard-title">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M17 8C8 10 5.9 16.17 3.82 21.34l1.89.66L7 19"/>
          <path d="M2 2l7.58 11.58"/>
          <circle cx="11" cy="11" r="2"/>
        </svg>
        环保贡献总览
      </div>
      <div class="eco-metrics">
        <div class="eco-metric-card">
          <div class="eco-metric-icon icon-points">🌱</div>
          <div class="eco-metric-value">{{ ecoConfig.totalPoints }}</div>
          <div class="eco-metric-unit">积分</div>
          <div class="eco-metric-label">累计积分</div>
        </div>
        <div class="eco-metric-card">
          <div class="eco-metric-icon icon-power">💡</div>
          <div class="eco-metric-value">{{ ecoConfig.savedPower }}</div>
          <div class="eco-metric-unit">kWh</div>
          <div class="eco-metric-label">节约电量</div>
        </div>
        <div class="eco-metric-card">
          <div class="eco-metric-icon icon-family">🏠</div>
          <div class="eco-metric-value">{{ ecoConfig.servedFamilies }}</div>
          <div class="eco-metric-unit">户</div>
          <div class="eco-metric-label">服务家庭</div>
        </div>
        <div class="eco-metric-card">
          <div class="eco-metric-icon icon-carbon">♻️</div>
          <div class="eco-metric-value">{{ ecoConfig.reducedCarbon }}</div>
          <div class="eco-metric-unit">kg</div>
          <div class="eco-metric-label">减少碳排放</div>
        </div>
      </div>
      <div class="eco-slogan">
        <p>每一次维修，都是对地球的一次温柔守护 <span class="eco-slogan-leaf">🍃</span></p>
      </div>
    </div>

    <div class="filter-toolbar">
      <input 
        v-model="searchKeyword" 
        type="text" 
        placeholder="搜索姓名/手机号..." 
        class="filter-input"
        @keyup.enter="loadPoints"
      />
      <select v-model="selectedCommunity" class="filter-select">
        <option value="">全部社区</option>
        <option v-for="community in communities" :key="community" :value="community">{{ community }}</option>
      </select>
      <select v-model="selectedPointRange" class="filter-select">
        <option value="">积分范围</option>
        <option value="500+">500分以上</option>
        <option value="1000+">1000分以上</option>
        <option value="negative">负积分</option>
      </select>
      <button class="btn-query" @click="loadPoints">查询</button>
      <button class="btn-reset" @click="resetFilters">重置</button>
      <button class="btn-export" @click="exportExcel">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/>
          <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
        导出Excel
      </button>
    </div>

    <div class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th>客户姓名</th>
            <th>联系方式</th>
            <th>当前积分</th>
            <th>累计获得</th>
            <th>累计消耗</th>
            <th>最近变动</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in pointsList" :key="item.id">
            <td><a class="customer-link" @click="openDetail(item)">{{ item.name }}</a></td>
            <td>{{ maskPhone(item.phone) }}</td>
            <td>
              <span :class="getPointsClass(item.current_points)">{{ formatNumber(item.current_points) }}</span>
            </td>
            <td>{{ formatNumber(item.total_earned_points) }}</td>
            <td>{{ formatNumber(item.total_spent_points) }}</td>
            <td>{{ formatDate(item.updated_at) }}</td>
            <td><button class="action-btn" @click="openDetail(item)">积分明细</button></td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="pagination-bar">
      <div class="pagination-info">共 {{ total }} 条，每页 
        <select v-model="pageSize" @change="loadPoints">
          <option :value="20">20</option>
          <option :value="50">50</option>
        </select> 条
      </div>
      <div class="pagination-buttons">
        <button class="page-btn nav-arrow" :disabled="currentPage <= 1" @click="prevPage">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <button 
          v-for="page in visiblePages" 
          :key="page" 
          :class="['page-btn', { active: currentPage === page }]"
          @click="goToPage(page)"
        >
          {{ page }}
        </button>
        <button class="page-btn nav-arrow" :disabled="currentPage >= totalPages" @click="nextPage">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </button>
      </div>
    </div>

    <div v-if="showDetailModal" class="dialog-overlay active" @click="closeDetail">
      <div class="dialog">
        <div class="dialog-header">
          <div class="dialog-title">
            {{ detailCustomer?.name || '' }} 的积分明细
            <span class="points-summary">当前 {{ formatNumber(detailCustomer?.current_points || 0) }} 积分</span>
          </div>
          <button class="dialog-close" @click="closeDetail">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div class="dialog-body">
          <div v-for="record in pointRecords" :key="record.id" class="point-record">
            <div :class="['point-record-icon', record.type]">
              <svg v-if="record.type === 'earn'" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
                <polyline points="17 6 23 6 23 12"/>
              </svg>
              <svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/>
                <polyline points="17 18 23 18 23 12"/>
              </svg>
            </div>
            <div class="point-record-info">
              <div class="point-record-type">{{ getRecordType(record) }}</div>
              <div class="point-record-detail">{{ getRecordDetail(record) }}</div>
            </div>
            <div class="point-record-right">
              <div :class="['point-record-amount', record.type === 'earn' ? 'positive' : 'negative']">
                {{ record.type === 'earn' ? '+' : '' }}{{ record.points }}
              </div>
              <div class="point-record-time">{{ formatDateTime(record.created_at) }}</div>
            </div>
          </div>

          <button v-if="!showDeductForm" class="btn-deduct" @click.stop="showDeductForm = true">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M5 12h14"/>
              <path d="M12 5v14"/>
            </svg>
            扣减积分（兑换物品）
          </button>

          <div v-show="showDeductForm" class="deduct-form">
            <h4>扣减积分</h4>
            <div class="form-row">
              <span class="form-label">扣减积分</span>
              <input v-model="deductPoints" type="number" min="1" placeholder="输入扣减的积分数量" class="form-input"/>
            </div>
            <div class="form-row">
              <span class="form-label">兑换物品</span>
              <input v-model="deductItem" type="text" placeholder="如：LED灯泡×2、节水龙头×1" class="form-input"/>
            </div>
            <div class="form-row">
              <span class="form-label">备注</span>
              <input v-model="deductRemark" type="text" placeholder="选填" class="form-input"/>
            </div>
            <div class="form-actions">
              <button class="btn-sm ghost" @click="cancelDeduct">取消</button>
              <button class="btn-sm danger" @click="confirmDeduct">确认扣减</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>import { ref, computed, onMounted } from 'vue';
import api from '../utils/api';
const ecoConfig = ref({
 totalPoints: 0,
 savedPower: 0,
 servedFamilies: 0,
 reducedCarbon: 0
});
const communities = ['幸福社区', '凤城社区', '锦业社区', '金色阳光社区', '紫薇社区', '龙湖社区'];
const searchKeyword = ref('');
const selectedCommunity = ref('');
const selectedPointRange = ref('');
const pageSize = ref(20);
const currentPage = ref(1);
const total = ref(0);
const pointsList = ref([]);
const showDetailModal = ref(false);
const detailCustomer = ref(null);
const pointRecords = ref([]);
const showDeductForm = ref(false);
const deductPoints = ref('');
const deductItem = ref('');
const deductRemark = ref('');
const totalPages = computed(() => Math.ceil(total.value / pageSize.value));
const visiblePages = computed(() => {
 const pages = [];
 const total = totalPages.value;
 const current = currentPage.value;
 if (total <= 5) {
 for (let i = 1; i <= total; i++)
 pages.push(i);
 }
 else {
 if (current <= 3) {
 pages.push(1, 2, 3, 4, 5);
 }
 else if (current >= total - 2) {
 pages.push(total - 4, total - 3, total - 2, total - 1, total);
 }
 else {
 pages.push(current - 2, current - 1, current, current + 1, current + 2);
 }
 }
 return pages;
});
const formatNumber = (num) => {
 if (num === null || num === undefined)
 return '0';
 return Number(num).toLocaleString();
};
const maskPhone = (phone) => {
 if (!phone)
 return '';
 return phone.replace(/(\d{3})(\d{4})(\d{4})/, '$1****$3');
};
const formatDate = (dateStr) => {
 if (!dateStr)
 return '-';
 const date = new Date(dateStr);
 return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};
const formatDateTime = (dateStr) => {
 if (!dateStr)
 return '';
 const date = new Date(dateStr);
 return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
};
const getPointsClass = (points) => {
 if (points > 0)
 return 'points-badge positive';
 if (points < 0)
 return 'points-badge negative';
 return 'points-badge zero';
};
const getRecordType = (record) => {
 if (record.type === 'earn') {
 if (record.order_id)
 return '工单完成';
 return '积分获得';
 }
 else {
 if (record.exchange_item)
 return `兑换物品 - ${record.exchange_item}`;
 return '积分扣减';
 }
};
const getRecordDetail = (record) => {
 if (record.type === 'earn' && record.order_id) {
 return `工单号 ${record.order_id}`;
 }
 if (record.reason) {
 return record.reason;
 }
 return record.type === 'earn' ? '自动发放' : '手动扣减';
};
const loadEcoConfig = async () => {
 try {
 const res = await api.get('/points/eco/config');
 if (res.data.success) {
 ecoConfig.value = res.data.data;
 }
 }
 catch (error) {
 console.error('获取环保配置失败:', error);
 }
};
const loadPoints = async () => {
 try {
 const params = {
 page: currentPage.value,
 pageSize: pageSize.value,
 keyword: searchKeyword.value || undefined,
 community: selectedCommunity.value || undefined,
 pointRange: selectedPointRange.value || undefined
 };
 const res = await api.get('/points', { params });
 if (res.data.success) {
 pointsList.value = res.data.data.list;
 total.value = res.data.data.total;
 }
 }
 catch (error) {
 console.error('获取积分列表失败:', error);
 }
};
const resetFilters = () => {
 searchKeyword.value = '';
 selectedCommunity.value = '';
 selectedPointRange.value = '';
 currentPage.value = 1;
 loadPoints();
};
const prevPage = () => {
 if (currentPage.value > 1) {
 currentPage.value--;
 loadPoints();
 }
};
const nextPage = () => {
 if (currentPage.value < totalPages.value) {
 currentPage.value++;
 loadPoints();
 }
};
const goToPage = (page) => {
 currentPage.value = page;
 loadPoints();
};
const openDetail = async (customer) => {
 detailCustomer.value = customer;
 showDetailModal.value = true;
 try {
 const res = await api.get(`/points/${customer.id}/records`);
 if (res.data.success) {
 pointRecords.value = res.data.data.records;
 }
 }
 catch (error) {
 console.error('获取积分明细失败:', error);
 }
};
const closeDetail = () => {
  showDetailModal.value = false;
  showDeductForm.value = false;
  deductPoints.value = '';
  deductItem.value = '';
  deductRemark.value = '';
};
const cancelDeduct = () => {
 showDeductForm.value = false;
 deductPoints.value = '';
 deductItem.value = '';
 deductRemark.value = '';
};
const confirmDeduct = async () => {
 if (!deductPoints.value || deductPoints.value <= 0) {
 alert('请输入有效的扣减积分数量');
 return;
 }
 try {
 const res = await api.post(`/points/${detailCustomer.value.id}/deduct`, {
 points: deductPoints.value,
 exchangeItem: deductItem.value,
 reason: deductRemark.value
 });
 if (res.data.success) {
 alert('积分扣减成功');
 cancelDeduct();
 loadPoints();
 const recordsRes = await api.get(`/points/${detailCustomer.value.id}/records`);
 if (recordsRes.data.success) {
 pointRecords.value = recordsRes.data.data.records;
 detailCustomer.value.current_points -= parseInt(deductPoints.value);
 }
 }
 }
 catch (error) {
 alert('积分扣减失败: ' + (error.response?.data?.message || error.message));
 }
};
const exportExcel = () => {
 alert('导出功能开发中');
};
onMounted(() => {
 loadEcoConfig();
 loadPoints();
});
</script>

<style scoped>
.page-container {
  padding: 24px 28px 20px;
  position: relative;
  z-index: 1;
}

.eco-dashboard {
  background: linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 50%, #A7F3D0 100%);
  border: 1px solid rgba(16,185,129,0.15);
  border-radius: 28px 20px 28px 20px;
  padding: 36px 32px 28px;
  margin-bottom: 24px;
  position: relative;
  overflow: hidden;
  box-shadow: 0 8px 32px -4px rgba(16,185,129,0.12);
}

.eco-dashboard::before, .eco-dashboard::after {
  content: '';
  position: absolute;
  pointer-events: none;
}

.eco-dashboard::before {
  top: -30px;
  right: -20px;
  width: 180px;
  height: 180px;
  background: rgba(16,185,129,0.08);
  border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%;
}

.eco-dashboard::after {
  bottom: -20px;
  left: 40px;
  width: 120px;
  height: 120px;
  background: rgba(52,211,153,0.08);
  border-radius: 40% 60% 70% 30% / 40% 70% 30% 60%;
}

.eco-dashboard-title {
  font-family: 'Fraunces', serif;
  font-weight: 700;
  font-size: 22px;
  color: #065F46;
  margin-bottom: 24px;
  display: flex;
  align-items: center;
  gap: 10px;
  position: relative;
  z-index: 1;
}

.eco-dashboard-title svg {
  width: 26px;
  height: 26px;
  color: #10B981;
}

.eco-metrics {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  position: relative;
  z-index: 1;
}

.eco-metric-card {
  background: rgba(255,255,255,0.7);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(16,185,129,0.12);
  padding: 24px 20px;
  text-align: center;
  transition: all 0.3s ease;
  box-shadow: 0 4px 16px -2px rgba(16,185,129,0.08);
}

.eco-metric-card:nth-child(1) { border-radius: 20px 14px 20px 14px; }
.eco-metric-card:nth-child(2) { border-radius: 14px 20px 14px 20px; }
.eco-metric-card:nth-child(3) { border-radius: 20px 20px 14px 14px; }
.eco-metric-card:nth-child(4) { border-radius: 14px 14px 20px 20px; }

.eco-metric-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 12px 28px -4px rgba(16,185,129,0.15);
}

.eco-metric-icon {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  margin: 0 auto 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26px;
  line-height: 1;
}

.eco-metric-icon.icon-points { background: rgba(16,185,129,0.12); }
.eco-metric-icon.icon-power { background: rgba(232,184,75,0.15); }
.eco-metric-icon.icon-family { background: rgba(74,127,181,0.1); }
.eco-metric-icon.icon-carbon { background: rgba(52,211,153,0.12); }

.eco-metric-value {
  font-family: 'Fraunces', serif;
  font-weight: 800;
  font-size: 36px;
  color: #065F46;
  line-height: 1.1;
  margin-bottom: 4px;
}

.eco-metric-unit {
  font-family: 'Nunito', sans-serif;
  font-weight: 500;
  font-size: 14px;
  color: #065F46;
  opacity: 0.7;
}

.eco-metric-label {
  font-size: 13px;
  font-weight: 600;
  color: #065F46;
  margin-top: 6px;
}

.eco-slogan {
  text-align: center;
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid rgba(16,185,129,0.15);
  position: relative;
  z-index: 1;
}

.eco-slogan p {
  font-family: 'Fraunces', serif;
  font-weight: 600;
  font-size: 16px;
  color: #065F46;
  opacity: 0.7;
  letter-spacing: 0.5px;
}

.eco-slogan-leaf {
  display: inline-block;
  margin: 0 4px;
  font-size: 14px;
  opacity: 0.5;
}

.filter-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.filter-input {
  flex: 1;
  min-width: 180px;
  height: 44px;
  border-radius: 999px;
  border: 1px solid rgba(222,216,207,0.8);
  background: rgba(255,255,255,0.5);
  padding: 0 18px;
  font-family: inherit;
  font-size: 13px;
  color: #2C2C24;
  outline: none;
  transition: all 0.3s ease;
}

.filter-input::placeholder { color: #78786C; opacity: 0.7; }
.filter-input:focus { 
  box-shadow: 0 0 0 2px rgba(16,185,129,0.2); 
  border-color: rgba(16,185,129,0.3); 
  background: rgba(255,255,255,0.8); 
}

.filter-select {
  height: 44px;
  border-radius: 999px;
  border: 1px solid rgba(222,216,207,0.8);
  background: rgba(255,255,255,0.5);
  padding: 0 16px;
  font-family: inherit;
  font-size: 13px;
  color: #2C2C24;
  outline: none;
  cursor: pointer;
  transition: all 0.3s ease;
  appearance: none;
  -webkit-appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1.5L6 6.5L11 1.5' stroke='%2378786C' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 14px center;
  padding-right: 36px;
}

.filter-select:focus { 
  box-shadow: 0 0 0 2px rgba(16,185,129,0.2); 
  border-color: rgba(16,185,129,0.3); 
}

.btn-query {
  height: 44px;
  padding: 0 24px;
  border-radius: 999px;
  border: none;
  background: #10B981;
  color: white;
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 4px 16px -2px rgba(16,185,129,0.25);
  transition: all 0.3s ease;
  white-space: nowrap;
}

.btn-query:hover { transform: scale(1.05); box-shadow: 0 6px 20px -2px rgba(16,185,129,0.3); }
.btn-query:active { transform: scale(0.95); }

.btn-reset {
  height: 44px;
  padding: 0 20px;
  border-radius: 999px;
  border: 2px solid #E8B84B;
  background: transparent;
  color: #E8B84B;
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  white-space: nowrap;
}

.btn-reset:hover { background: rgba(232,184,75,0.08); transform: scale(1.05); }
.btn-reset:active { transform: scale(0.95); }

.btn-export {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 44px;
  padding: 0 20px;
  border-radius: 999px;
  border: 2px solid #E8B84B;
  background: transparent;
  color: #E8B84B;
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  white-space: nowrap;
  margin-left: auto;
}

.btn-export:hover { background: rgba(232,184,75,0.08); transform: scale(1.05); }
.btn-export svg { width: 16px; height: 16px; stroke-width: 2; }

.table-container {
  background: #FEFEFA;
  border: 1px solid rgba(222,216,207,0.5);
  border-radius: 24px;
  box-shadow: 0 4px 20px -2px rgba(74,127,181,0.15);
  overflow: hidden;
  margin-bottom: 16px;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table thead th {
  padding: 14px 16px;
  font-size: 12px;
  font-weight: 600;
  color: #78786C;
  text-align: left;
  border-bottom: 1px solid #DED8CF;
  white-space: nowrap;
}

.data-table thead th:first-child { padding-left: 24px; }
.data-table thead th:last-child { padding-right: 24px; text-align: center; }

.data-table tbody tr {
  height: 52px;
  transition: background 0.3s ease;
}

.data-table tbody tr:hover { background: rgba(240,235,229,0.4); }

.data-table tbody td {
  padding: 10px 16px;
  font-size: 13px;
  color: #2C2C24;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 160px;
}

.data-table tbody td:first-child { padding-left: 24px; }
.data-table tbody td:last-child { padding-right: 24px; text-align: center; }

.customer-link {
  color: #10B981;
  font-weight: 600;
  cursor: pointer;
  text-decoration: none;
  transition: color 0.2s ease;
}

.customer-link:hover { color: #059669; }

.points-badge {
  display: inline-flex;
  align-items: center;
  padding: 3px 12px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 700;
  font-family: 'Fraunces', serif;
}

.points-badge.positive { background: rgba(16,185,129,0.1); color: #065F46; }
.points-badge.negative { background: rgba(212,114,106,0.1); color: #D4726A; }
.points-badge.zero { background: rgba(120,120,108,0.1); color: #78786C; }

.action-btn {
  background: none;
  border: none;
  color: #10B981;
  font-family: inherit;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 8px;
  transition: all 0.3s ease;
}

.action-btn:hover { background: rgba(16,185,129,0.08); color: #059669; }

.pagination-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 4px;
}

.pagination-info {
  font-size: 13px;
  color: #78786C;
}

.pagination-info select {
  border: none;
  background: transparent;
  font-family: inherit;
  font-size: 13px;
  color: #78786C;
  cursor: pointer;
  outline: none;
}

.pagination-buttons {
  display: flex;
  align-items: center;
  gap: 6px;
}

.page-btn {
  min-width: 36px;
  height: 36px;
  border-radius: 999px;
  border: none;
  background: transparent;
  color: #78786C;
  font-family: inherit;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}

.page-btn:hover { background: rgba(230,220,205,0.4); }
.page-btn.active { 
  background: #10B981; 
  color: white; 
  box-shadow: 0 4px 16px -2px rgba(16,185,129,0.25); 
}
.page-btn.nav-arrow { padding: 0 10px; }
.page-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.page-btn svg { width: 16px; height: 16px; stroke-width: 2; }

.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(44,44,36,0.3);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  opacity: 0;
  visibility: hidden;
  transition: all 0.3s ease;
}

.dialog-overlay.active { opacity: 1; visibility: visible; }

.dialog {
  background: #FEFEFA;
  border: 1px solid rgba(222,216,207,0.5);
  border-radius: 24px 16px 24px 16px;
  box-shadow: 0 20px 60px -15px rgba(44,44,36,0.2);
  padding: 28px 32px;
  width: 560px;
  max-width: 90vw;
  max-height: 80vh;
  transform: scale(0.9) translateY(10px);
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
}

.dialog-overlay.active .dialog { transform: scale(1) translateY(0); }

.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid #DED8CF;
}

.dialog-title {
  font-family: 'Fraunces', serif;
  font-weight: 700;
  font-size: 18px;
  color: #2C2C24;
  display: flex;
  align-items: center;
  gap: 10px;
}

.dialog-title .points-summary {
  font-size: 14px;
  font-weight: 600;
  color: #065F46;
  background: rgba(16,185,129,0.1);
  padding: 3px 12px;
  border-radius: 999px;
}

.dialog-close {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: #78786C;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}

.dialog-close:hover { background: rgba(222,216,207,0.4); color: #2C2C24; }
.dialog-close svg { width: 18px; height: 18px; stroke-width: 2; }

.dialog-body {
  flex: 1;
  overflow-y: auto;
}

.dialog-body::-webkit-scrollbar { width: 4px; }
.dialog-body::-webkit-scrollbar-thumb { background: #DED8CF; border-radius: 2px; }

.point-record {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 0;
  border-bottom: 1px solid rgba(222,216,207,0.3);
}

.point-record:last-child { border-bottom: none; }

.point-record-icon {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.point-record-icon.earn { background: rgba(16,185,129,0.1); color: #10B981; }
.point-record-icon.spend { background: rgba(212,114,106,0.1); color: #D4726A; }
.point-record-icon svg { width: 16px; height: 16px; stroke-width: 2; }

.point-record-info {
  flex: 1;
  min-width: 0;
}

.point-record-type {
  font-size: 13px;
  font-weight: 600;
  color: #2C2C24;
  margin-bottom: 2px;
}

.point-record-detail {
  font-size: 12px;
  color: #78786C;
}

.point-record-right {
  text-align: right;
  flex-shrink: 0;
}

.point-record-amount {
  font-family: 'Fraunces', serif;
  font-weight: 700;
  font-size: 16px;
}

.point-record-amount.positive { color: #065F46; }
.point-record-amount.negative { color: #D4726A; }

.point-record-time {
  font-size: 11px;
  color: #78786C;
  margin-top: 2px;
}

.btn-deduct {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 14px;
  border-radius: 999px;
  border: 1px solid rgba(212,114,106,0.3);
  background: rgba(212,114,106,0.05);
  color: #D4726A;
  font-family: inherit;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-top: 12px;
}

.btn-deduct:hover { 
  background: rgba(212,114,106,0.1); 
  border-color: rgba(212,114,106,0.5); 
}
.btn-deduct svg { width: 14px; height: 14px; stroke-width: 2; }

.deduct-form {
  background: rgba(212,114,106,0.04);
  border: 1px dashed rgba(212,114,106,0.2);
  border-radius: 16px;
  padding: 16px;
  margin-top: 16px;
}

.deduct-form h4 {
  font-family: 'Fraunces', serif;
  font-weight: 600;
  font-size: 14px;
  color: #D4726A;
  margin-bottom: 12px;
}

.form-row {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
  align-items: center;
}

.form-label {
  font-size: 13px;
  font-weight: 500;
  color: #78786C;
  min-width: 70px;
}

.form-input {
  flex: 1;
  height: 38px;
  border-radius: 12px;
  border: 1px solid #DED8CF;
  background: #FEFEFA;
  padding: 0 14px;
  font-family: inherit;
  font-size: 13px;
  color: #2C2C24;
  outline: none;
  transition: all 0.3s ease;
}

.form-input:focus { 
  border-color: #D4726A; 
  box-shadow: 0 0 0 2px rgba(212,114,106,0.15); 
}

.form-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  margin-top: 4px;
}

.btn-sm {
  height: 34px;
  padding: 0 18px;
  border-radius: 999px;
  border: none;
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-sm.danger { background: #D4726A; color: white; }
.btn-sm.danger:hover { opacity: 0.9; }
.btn-sm.ghost { 
  background: transparent; 
  border: 1px solid #DED8CF; 
  color: #78786C; 
}
.btn-sm.ghost:hover { border-color: #2C2C24; color: #2C2C24; }
</style>
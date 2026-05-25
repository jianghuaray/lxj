<template>
  <div class="order-detail-page">
    <div class="detail-header">
      <div class="detail-header-left">
        <button class="btn-back" @click="$router.push('/orders')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="15 18 9 12 15 6"/></svg>
          返回列表
        </button>
        <span class="order-number">{{ order.orderNo || '-' }}</span>
        <span class="status-pill" :class="getStatusClass(order.status)">
          <svg v-if="order.status === 'completed'" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          <svg v-else-if="order.status === 'consultation'" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          {{ getStatusText(order.status) }}
        </span>
      </div>
      <div class="detail-header-right">
        <button class="btn-outline primary" v-if="order.status === 'pending'" @click="showDispatchDialog = true">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
          派单
        </button>
        <button class="btn-followup header-action-btn" v-if="order.status === 'dispatched'" @click="completeOrderDirectly">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
          完成工单
        </button>
        <button class="btn-followup header-action-btn" v-if="order.status === 'completed'" @click="startEditCallback">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
          执行回访
        </button>
        <button class="btn-followup header-action-btn" v-if="order.status === 'consultation'" @click="convertToFormal">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
          转正式单
        </button>
        <button class="btn-outline danger" v-if="['pending', 'dispatched'].includes(order.status)" @click="cancelOrder">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
          取消工单
        </button>
        <button class="btn-outline danger" @click="confirmDeleteOrder">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
          删除工单
        </button>
      </div>
    </div>

    <div class="timeline-section">
      <div class="timeline-track">
        <div class="timeline-line">
          <div class="timeline-line-fill" :style="{ width: getTimelineProgress() + '%' }"></div>
        </div>
        <div class="timeline-step" :class="{ pending: !isStepDone('pending') }">
          <div class="timeline-node" :class="{ done: isStepDone('pending'), current: order.status === 'pending' }">
            <svg v-if="isStepDone('pending')" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
            <svg v-else viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/></svg>
          </div>
          <div class="timeline-label">待派单</div>
          <div class="timeline-meta">{{ getStepTime('pending') || '待处理' }}</div>
          <div class="timeline-meta">{{ getStepOperator('pending') }}</div>
        </div>
        <div class="timeline-step" :class="{ pending: !isStepDone('dispatched') }">
          <div class="timeline-node" :class="{ done: isStepDone('dispatched'), current: order.status === 'dispatched' }">
            <svg v-if="isStepDone('dispatched')" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
            <svg v-else viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/></svg>
          </div>
          <div class="timeline-label">已派单</div>
          <div class="timeline-meta">{{ getStepTime('dispatched') || '待处理' }}</div>
          <div class="timeline-meta">{{ getStepOperator('dispatched') }}</div>
        </div>
        <div class="timeline-step" :class="{ pending: !isStepDone('completed') }">
          <div class="timeline-node" :class="{ done: isStepDone('completed'), current: order.status === 'completed' }">
            <svg v-if="isStepDone('completed')" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
            <svg v-else viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/></svg>
          </div>
          <div class="timeline-label">已完成</div>
          <div class="timeline-meta">{{ getStepTime('completed') || '待处理' }}</div>
          <div class="timeline-meta">{{ getStepOperator('completed') }}</div>
        </div>
        <div class="timeline-step" :class="{ pending: !isStepDone('callback') }">
          <div class="timeline-node" :class="{ done: isStepDone('callback'), current: order.status === 'callback' }">
            <svg v-if="isStepDone('callback')" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
            <svg v-else viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/></svg>
          </div>
          <div class="timeline-label">已回访</div>
          <div class="timeline-meta">{{ getStepTime('callback') || '待处理' }}</div>
          <div class="timeline-meta">{{ getStepOperator('callback') }}</div>
        </div>
      </div>
    </div>

    <div class="info-cards-grid">
      <div class="info-card customer-info-card">
        <div class="card-title" style="justify-content:space-between;">
          <div style="display:flex;align-items:center;gap:8px;">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
            客户信息
          </div>
          <button class="btn-outline primary" style="padding:5px 14px;font-size:12px;" @click="startEditCustomer" v-if="!editingCustomer">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" width="13" height="13" stroke-width="2"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
            编辑
          </button>
        </div>

        <div class="field-list" v-if="!editingCustomer">
          <div class="field-row">
            <span class="field-label">姓名</span>
            <span class="field-value">{{ getCustomerName() }}</span>
          </div>
          <div class="field-row">
            <span class="field-label">联系方式</span>
            <span class="field-value">{{ getCustomerPhone() }}</span>
          </div>
          <div class="field-row">
            <span class="field-label">区域</span>
            <span class="field-value">{{ getArea() }}</span>
          </div>
          <div class="field-row">
            <span class="field-label">住址</span>
            <span class="field-value">{{ getAddress() }}</span>
          </div>
          <div class="field-row">
            <span class="field-label">来源渠道</span>
            <span class="field-value">{{ getSourceChannel() }}</span>
          </div>
          <div class="field-row">
            <span class="field-label">问题分类</span>
            <span class="field-value"><span class="category-pill" v-if="getProblemCategory() !== '-'">{{ getProblemCategory() }}</span><span v-else>-</span></span>
          </div>
          <div class="field-row">
            <span class="field-label">问题描述</span>
            <span class="field-value">{{ getProblemDescription() }}</span>
          </div>
          <div class="field-row">
            <span class="field-label">接线员</span>
            <span class="field-value">{{ order.receiverName || '-' }}</span>
          </div>
          <div class="field-row">
            <span class="field-label">受理时间</span>
            <span class="field-value">{{ formatTime(order.receivedAt) }}</span>
          </div>
          <div class="field-row">
            <span class="field-label">接线员备注</span>
            <span class="field-value" :class="{ empty: !order.receiverRemark }">{{ getReceiverRemark() }}</span>
          </div>
        </div>

        <div class="field-list" v-if="editingCustomer">
          <div class="field-row">
            <span class="field-label">姓名<span class="required-mark">*</span></span>
            <input class="pill-input" v-model="customerEditForm.customerName" placeholder="请输入姓名" />
          </div>
          <div class="field-row">
            <span class="field-label">联系方式<span class="required-mark">*</span></span>
            <input class="pill-input" v-model="customerEditForm.customerPhone" placeholder="请输入联系方式" />
          </div>
          <div class="field-row">
            <span class="field-label">区域<span class="required-mark">*</span></span>
            <el-select v-model="customerEditForm.area" class="pill-select-el" placeholder="请选择" clearable>
              <el-option label="未央区" value="未央区" />
              <el-option label="雁塔区" value="雁塔区" />
              <el-option label="碑林区" value="碑林区" />
              <el-option label="莲湖区" value="莲湖区" />
              <el-option label="新城区" value="新城区" />
              <el-option label="灞桥区" value="灞桥区" />
              <el-option label="长安区" value="长安区" />
              <el-option label="高新区" value="高新区" />
              <el-option label="曲江新区" value="曲江新区" />
              <el-option label="经开区" value="经开区" />
            </el-select>
          </div>
          <div class="field-row">
            <span class="field-label">住址<span class="required-mark">*</span></span>
            <input class="pill-input" v-model="customerEditForm.address" placeholder="请输入住址" />
          </div>
          <div class="field-row">
            <span class="field-label">来源渠道<span class="required-mark">*</span></span>
            <el-select v-model="customerEditForm.sourceChannel" class="pill-select-el" placeholder="请选择" clearable>
              <el-option v-for="item in sourceChannelOptions" :key="item.value" :label="item.label" :value="item.value" />
            </el-select>
          </div>
          <div class="field-row">
            <span class="field-label">问题分类<span class="required-mark">*</span></span>
            <el-select v-model="customerEditForm.problemCategory" class="pill-select-el" placeholder="请选择" clearable>
              <el-option v-for="cat in settingsStore.serviceTypes" :key="cat" :label="cat" :value="cat" />
            </el-select>
          </div>
          <div class="field-row">
            <span class="field-label">问题描述<span class="required-mark">*</span></span>
            <input class="pill-input" v-model="customerEditForm.problemDescription" placeholder="请输入问题描述" />
          </div>
          <div class="field-row">
            <span class="field-label">接线员</span>
            <span class="field-value">{{ order.receiverName || '-' }}</span>
          </div>
          <div class="field-row">
            <span class="field-label">受理时间</span>
            <span class="field-value">{{ formatTime(order.receivedAt) }}</span>
          </div>
          <div class="field-row">
            <span class="field-label">接线员备注</span>
            <input class="pill-input" v-model="customerEditForm.receiverRemark" placeholder="请输入备注" />
          </div>
        </div>

        <div class="customer-edit-bar" v-if="editingCustomer">
          <label class="sync-checkbox">
            <input type="checkbox" v-model="syncCustomerChecked" />
            同步更新客户档案
          </label>
          <div class="customer-edit-actions">
            <button class="btn-outline gray" style="padding:6px 16px;font-size:12px;" @click="cancelEditCustomer">取消</button>
            <button class="btn-followup" style="width:auto;margin-bottom:0;padding:6px 16px;font-size:12px;" @click="saveCustomer" :disabled="customerSaving">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
              {{ customerSaving ? '保存中...' : '保存' }}
            </button>
          </div>
        </div>
      </div>

      <div class="info-card construction-info-card">
        <div class="card-title" style="justify-content:space-between;">
          <div style="display:flex;align-items:center;gap:8px;">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
            施工信息
          </div>
          <button class="card-edit-btn" @click="startEditConstruction" v-if="!editingConstruction && isCompletedOrCallback()">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" width="14" height="14" stroke-width="2"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
          </button>
        </div>

        <div class="complete-order-form" v-if="showConstructionForm">
          <div class="complete-order-title">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" width="16" height="16" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
            {{ constructionFormTitle }}
          </div>

          <section class="construction-form-section">
            <div class="construction-section-title">完工信息</div>
            <div class="construction-form-grid">
              <div class="form-group">
                <label class="form-label">施工完成时间</label>
                <el-date-picker
                  v-model="constructionEditForm.completedAt"
                  class="pill-select-el"
                  type="datetime"
                  value-format="YYYY-MM-DDTHH:mm"
                  format="YYYY-MM-DD HH:mm"
                  placeholder="请选择施工完成时间"
                />
              </div>
              <div class="form-group">
                <label class="form-label">维修师傅</label>
                <el-select v-model="constructionEditForm.technicianId" class="pill-select-el" placeholder="请选择师傅" clearable @change="onTechnicianChange">
                  <el-option v-for="tech in availableTechnicians" :key="tech.id" :label="tech.name" :value="tech.id" />
                </el-select>
              </div>
              <div class="form-group full-span">
                <label class="form-label">实际维修项目</label>
                <textarea class="pill-textarea" v-model="constructionEditForm.actualWork" placeholder="请描述实际维修内容" rows="3"></textarea>
              </div>
            </div>
          </section>

          <section class="construction-form-section">
            <div class="construction-section-title">费用基础</div>
            <div class="construction-form-grid">
              <div class="form-group">
                <label class="form-label">订单总额（元）</label>
                <input type="number" class="pill-input" v-model.number="constructionEditForm.orderAmount" placeholder="请输入订单总额" min="0" step="0.01" />
              </div>
              <div class="form-group">
                <label class="form-label">材料成本（元）</label>
                <input type="number" class="pill-input" v-model.number="constructionEditForm.materialCost" placeholder="请输入材料成本" min="0" step="0.01" />
              </div>
              <div class="form-group">
                <label class="form-label">可分成金额（元）</label>
                <input type="number" class="pill-input readonly-field" :value="(constructionEditForm.shareBaseAmount || 0).toFixed(2)" disabled />
              </div>
              <div class="form-group">
                <label class="form-label">实收金额（元）</label>
                <input type="number" class="pill-input" v-model.number="constructionEditForm.receivedAmount" placeholder="默认等于订单总额" min="0" step="0.01" />
              </div>
              <div class="form-group">
                <label class="form-label">收款方</label>
                <el-select v-model="constructionEditForm.collectionParty" class="pill-select-el" placeholder="请选择收款方">
                  <el-option label="师傅收款" value="technician" />
                  <el-option label="物业收款" value="property" />
                  <el-option label="公司收款" value="company" />
                  <el-option label="其他" value="other" />
                </el-select>
              </div>
              <div class="form-group">
                <label class="form-label">公司实得（元）</label>
                <input type="number" class="pill-input readonly-field" :value="(constructionEditForm.companyAmount || 0).toFixed(2)" disabled />
              </div>
            </div>
          </section>

          <section class="construction-form-section">
            <div class="construction-section-title">分成与结算</div>
            <table class="share-edit-table">
              <thead>
                <tr>
                  <th>参与方</th>
                  <th>比例（%）</th>
                  <th>金额（元）</th>
                  <th>结算状态</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <div class="share-party-cell">
                      <span class="share-party-name">{{ selectedTechnicianName }}</span>
                    </div>
                  </td>
                  <td><input type="number" class="table-input" v-model.number="constructionEditForm.technicianRatePercent" min="0" step="0.01" /></td>
                  <td><span class="share-amount-text">{{ (constructionEditForm.technicianAmount || 0).toFixed(2) }}</span></td>
                  <td>
                    <div class="settlement-switch-cell">
                      <el-switch v-model="constructionEditForm.technicianSettlementStatus" active-value="settled" inactive-value="unsettled" class="settlement-switch" />
                      <span class="settlement-switch-label" :class="{ settled: constructionEditForm.technicianSettlementStatus === 'settled' }">
                        {{ constructionEditForm.technicianSettlementStatus === 'settled' ? '已结' : '未结' }}
                      </span>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td>
                    <div class="share-party-cell">
                      <el-select v-model="constructionEditForm.propertyId" class="table-select-el share-party-select" placeholder="无物业参与" clearable @change="onPropertyChange">
                        <el-option v-for="item in activeProperties" :key="item.id" :label="item.name" :value="item.id" />
                      </el-select>
                    </div>
                  </td>
                  <td><input type="number" class="table-input" v-model.number="constructionEditForm.propertyRatePercent" min="0" step="0.01" /></td>
                  <td><span class="share-amount-text">{{ (constructionEditForm.propertyAmount || 0).toFixed(2) }}</span></td>
                  <td>
                    <div class="settlement-switch-cell">
                      <template v-if="constructionEditForm.propertyId">
                        <el-switch v-model="constructionEditForm.propertySettlementStatus" active-value="settled" inactive-value="unsettled" class="settlement-switch" />
                        <span class="settlement-switch-label" :class="{ settled: constructionEditForm.propertySettlementStatus === 'settled' }">
                          {{ constructionEditForm.propertySettlementStatus === 'settled' ? '已结' : '未结' }}
                        </span>
                      </template>
                      <span v-else class="settlement-not-applicable">未参与</span>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td>
                    <div class="share-party-cell">
                      <el-select v-model="constructionEditForm.buildingManagerId" class="table-select-el share-party-select" placeholder="无楼管参与" clearable @change="onBuildingManagerChange">
                        <el-option v-for="item in filteredBuildingManagers" :key="item.id" :label="item.name" :value="item.id" />
                      </el-select>
                    </div>
                  </td>
                  <td><input type="number" class="table-input" v-model.number="constructionEditForm.buildingManagerRatePercent" min="0" step="0.01" /></td>
                  <td><span class="share-amount-text">{{ (constructionEditForm.buildingManagerAmount || 0).toFixed(2) }}</span></td>
                  <td>
                    <div class="settlement-switch-cell">
                      <template v-if="constructionEditForm.buildingManagerId">
                        <el-switch v-model="constructionEditForm.buildingManagerSettlementStatus" active-value="settled" inactive-value="unsettled" class="settlement-switch" />
                        <span class="settlement-switch-label" :class="{ settled: constructionEditForm.buildingManagerSettlementStatus === 'settled' }">
                          {{ constructionEditForm.buildingManagerSettlementStatus === 'settled' ? '已结' : '未结' }}
                        </span>
                      </template>
                      <span v-else class="settlement-not-applicable">未参与</span>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </section>

          <div class="complete-order-actions">
            <button class="btn-outline gray" style="padding:8px 20px;" @click="cancelEditConstruction">取消</button>
            <button class="btn-followup" style="width:auto;margin-bottom:0;" @click="saveConstruction" :disabled="constructionSaving">
              <svg v-if="order.status === 'dispatched'" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
              {{ constructionSaving ? constructionSavingText : constructionSubmitText }}
            </button>
          </div>
        </div>

        <template v-if="!editingConstruction && isCompletedOrCallback()">
          <div class="field-list">
            <div class="field-row">
              <span class="field-label">维修师傅</span>
              <span class="field-value"><span class="worker-link">{{ getTechnicianName() }}</span></span>
            </div>
          </div>
          <div v-if="hasFee()" class="settlement-summary">
            <div class="settlement-summary-item primary">
              <span>订单总额</span>
              <strong>¥{{ order.orderAmount || 0 }}</strong>
            </div>
            <div class="settlement-summary-item">
              <span>材料成本</span>
              <strong>¥{{ order.materialCost || 0 }}</strong>
            </div>
            <div class="settlement-summary-item">
              <span>可分成金额</span>
              <strong>¥{{ order.shareBaseAmount || 0 }}</strong>
            </div>
            <div class="settlement-summary-item">
              <span>公司实得</span>
              <strong>¥{{ order.companyAmount || 0 }}</strong>
            </div>
            <div class="settlement-summary-item">
              <span>实收金额</span>
              <strong>¥{{ order.receivedAmount || 0 }}</strong>
            </div>
            <div class="settlement-summary-item">
              <span>收款方</span>
              <strong>{{ getCollectionPartyText(order.collectionParty) }}</strong>
            </div>
          </div>
          <table class="settlement-table" v-if="hasFee()">
            <thead>
              <tr>
                <th>对象</th>
                <th>比例</th>
                <th>应结</th>
                <th>状态</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in settlementRows" :key="item.type">
                <td>
                  <span class="settlement-name">{{ item.name }}</span>
                  <span class="settlement-type">{{ item.label }}</span>
                </td>
                <td>{{ item.rate }}</td>
                <td>¥{{ item.amount }}</td>
                <td><span class="settlement-status" :class="item.status">{{ item.statusText }}</span></td>
              </tr>
            </tbody>
          </table>
          <div class="field-list" style="margin-top:12px;" v-if="getActualWork()">
            <div class="field-row">
              <span class="field-label">维修项目</span>
              <span class="field-value">{{ getActualWork() }}</span>
            </div>
            <div class="field-row">
              <span class="field-label">完成时间</span>
              <span class="field-value">{{ formatTime(order.completedAt) }}</span>
            </div>
          </div>
          <div class="no-data" v-if="!hasFee() && !getActualWork()">
            <span>暂未录入费用</span>
          </div>
        </template>

        <template v-if="!editingConstruction && order.status === 'pending'">
          <div class="no-data">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" width="32" height="32" stroke-width="1.5" style="opacity:0.3;margin-bottom:8px;"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
            <div>工单尚未派单</div>
          </div>
        </template>

      </div>

      <div class="info-card callback-info-card">
        <div class="card-title" style="justify-content:space-between;">
          <div style="display:flex;align-items:center;gap:8px;">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
            回访信息
          </div>
          <button class="card-edit-btn" @click="startEditCallback" v-if="!editingCallback && order.status === 'callback'">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" width="14" height="14" stroke-width="2"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
          </button>
        </div>

        <template v-if="!editingCallback">
          <div class="callback-empty-state" v-if="!isCompletedOrCallback()">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" width="32" height="32" stroke-width="1.5"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
            <div>工单完成后可执行回访</div>
          </div>

          <template v-if="order.status === 'completed' && !order.callbackRecord">
            <div class="followup-alert">
              <span class="alert-dot"></span>
              当前状态：未回访，请尽快安排回访
            </div>
          </template>

          <div v-if="order.callbackRecord" class="callback-summary-grid">
            <div class="callback-summary-item primary">
              <span class="callback-summary-label">满意度</span>
              <strong>{{ order.callbackRecord.isSatisfied ? '满意' : '不满意' }}</strong>
            </div>
            <div class="callback-summary-item">
              <span class="callback-summary-label">评分</span>
              <span class="callback-summary-value">
                <span class="stars">{{ '\u2605'.repeat(order.callbackRecord.satisfactionScore) }}<span class="stars-gray">{{ '\u2605'.repeat(5 - order.callbackRecord.satisfactionScore) }}</span></span>
                <span class="rating-score">{{ order.callbackRecord.satisfactionScore }}.0</span>
              </span>
            </div>
            <div class="callback-summary-item">
              <span class="callback-summary-label">费用</span>
              <strong>{{ order.callbackRecord.feeConsistent ? '一致' : '不一致' }}</strong>
            </div>
            <div class="callback-summary-item">
              <span class="callback-summary-label">方式</span>
              <strong>{{ getCallbackMethod(order.callbackRecord.callbackMethod) }}</strong>
            </div>
            <div class="callback-summary-item">
              <span class="callback-summary-label">回访人</span>
              <strong>{{ order.callbackRecord.callbackByName || '-' }}</strong>
            </div>
            <div class="callback-summary-item">
              <span class="callback-summary-label">时间</span>
              <strong>{{ formatTime(order.callbackRecord.callbackAt) }}</strong>
            </div>
            <div class="callback-summary-note" v-if="order.callbackRecord.otherFeedback">
              <span class="callback-summary-label">其他评价</span>
              <p>{{ order.callbackRecord.otherFeedback }}</p>
            </div>
          </div>
        </template>

        <div class="edit-form callback-edit-form" v-if="editingCallback">
          <div class="form-group">
            <label class="form-label">是否满意</label>
            <el-select v-model="callbackEditForm.isSatisfied" class="pill-select-el" placeholder="请选择" clearable>
              <el-option label="满意" :value="true" />
              <el-option label="不满意" :value="false" />
            </el-select>
          </div>
          <div class="form-group">
            <label class="form-label">满意度评分</label>
            <div class="star-rating">
              <svg class="star" :class="{ filled: i <= callbackEditForm.satisfactionScore }" v-for="i in 5" :key="i" viewBox="0 0 24 24" fill="currentColor" stroke="none" @click="callbackEditForm.satisfactionScore = i"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">费用是否一致</label>
            <div class="radio-group">
              <label class="radio-item">
                <input type="radio" v-model="callbackEditForm.feeConsistent" :value="true" /> 是
              </label>
              <label class="radio-item">
                <input type="radio" v-model="callbackEditForm.feeConsistent" :value="false" /> 否
              </label>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">回访方式</label>
            <el-select v-model="callbackEditForm.callbackMethod" class="pill-select-el" placeholder="请选择" clearable>
              <el-option label="电话" value="phone" />
              <el-option label="微信" value="wechat" />
              <el-option label="上门" value="visit" />
            </el-select>
          </div>
          <div class="form-group">
            <label class="form-label">其他评价</label>
            <textarea class="pill-textarea" v-model="callbackEditForm.otherFeedback" placeholder="请输入其他评价内容..." rows="3"></textarea>
          </div>
          <div class="edit-actions">
            <button class="btn-outline gray" style="padding:8px 20px;" @click="cancelEditCallback">取消</button>
            <button class="btn-followup" style="width:auto;margin-bottom:0;" @click="saveCallback" :disabled="callbackSaving">
              {{ callbackSaving ? '保存中...' : '保存' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="history-section">
      <div class="history-header">
        <span class="history-title">客户历史记录</span>
        <span class="history-subtitle">关联手机号：{{ order.customerPhone || '-' }}</span>
      </div>
      <table class="history-table" v-if="customerOrders.length > 0">
        <thead>
          <tr>
            <th>订单号</th>
            <th>问题分类</th>
            <th>问题描述</th>
            <th>处理师傅</th>
            <th>完成时间</th>
            <th>满意度</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="co in customerOrders" :key="co.id" @click="$router.push(`/orders/${co.id}`)" style="cursor: pointer;">
            <td><a class="history-order-id">{{ co.orderNo }}</a></td>
            <td><span class="category-pill">{{ co.problemCategory }}</span></td>
            <td>{{ co.problemDescription || '-' }}</td>
            <td>{{ co.technicianName || '-' }}</td>
            <td>{{ formatTime(co.completedAt) }}</td>
            <td v-if="co.satisfactionScore">
              <span class="stars">{{ '\u2605'.repeat(co.satisfactionScore) }}<span class="stars-gray">{{ '\u2605'.repeat(5 - co.satisfactionScore) }}</span></span>
              <span class="rating-score">{{ co.satisfactionScore }}.0</span>
            </td>
            <td v-else>
              <span class="pending-tag">待回访</span>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-else class="no-data">暂无历史工单</div>
    </div>

    <el-dialog v-model="showDispatchDialog" title="派单" width="560px" :close-on-click-modal="false">
      <div class="dispatch-form">
        <div class="dispatch-section">
          <h4>选择师傅</h4>
          <div class="technician-cards">
            <div
              v-for="tech in availableTechnicians"
              :key="tech.id"
              class="tech-card"
              :class="{ selected: selectedTechnician === tech.id }"
              @click="selectedTechnician = tech.id"
            >
              <div class="tech-avatar">{{ tech.name?.charAt(0) }}</div>
              <div class="tech-info">
                <div class="tech-name">{{ tech.name }}</div>
                <div class="tech-specialty">{{ tech.specialties?.join('、') || '-' }}</div>
              </div>
              <div class="tech-status">
                <span class="category-pill">在单 {{ tech.activeOrders || 0 }}</span>
              </div>
            </div>
          </div>
        </div>
        <div class="dispatch-section" style="margin-top:16px;">
          <label class="form-label">派单备注</label>
          <textarea class="pill-textarea" v-model="dispatchRemark" placeholder="可选填写派单备注" rows="2"></textarea>
        </div>
      </div>
      <template #footer>
        <el-button @click="showDispatchDialog = false">取消</el-button>
        <el-button type="primary" @click="assignOrder" :loading="assignLoading">确认派单</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '@/utils/api'
import { ElMessage, ElMessageBox } from 'element-plus'
import { formatTime } from '@/utils/format'
import { useSettingsStore } from '@/stores/settings'
import { useDeleteConfirm } from '@/composables/useDeleteConfirm'

const settingsStore = useSettingsStore()
const { confirmDelete } = useDeleteConfirm()

const route = useRoute()
const router = useRouter()
const orderId = route.params.id

const order = ref({})
const customerOrders = ref([])
const availableTechnicians = ref([])
const selectedTechnician = ref(null)
const dispatchRemark = ref('')
const showDispatchDialog = ref(false)
const assignLoading = ref(false)

const editingCustomer = ref(false)
const editingConstruction = ref(false)
const editingCallback = ref(false)
const customerSaving = ref(false)
const constructionSaving = ref(false)
const callbackSaving = ref(false)

const syncCustomerChecked = ref(false)

const customerEditForm = ref({
  customerName: '',
  customerPhone: '',
  area: '',
  address: '',
  sourceChannel: '',
  problemCategory: '',
  problemDescription: '',
  receiverRemark: ''
})

const constructionEditForm = ref({
  technicianId: '',
  orderAmount: 0,
  technicianRatePercent: 30,
  technicianAmount: 0,
  shareBaseAmount: 0,
  propertyId: null,
  propertyRatePercent: 0,
  propertyAmount: 0,
  buildingManagerId: null,
  buildingManagerRatePercent: 0,
  buildingManagerAmount: 0,
  companyAmount: 0,
  collectionParty: 'technician',
  technicianSettlementStatus: 'unsettled',
  propertySettlementStatus: 'unsettled',
  buildingManagerSettlementStatus: 'unsettled',
  receivedAmount: 0,
  materialCost: 0,
  actualWork: '',
  completedAt: ''
})

const callbackEditForm = ref({
  isSatisfied: true,
  satisfactionScore: 5,
  feeConsistent: true,
  callbackMethod: 'phone',
  otherFeedback: ''
})

const statusOrder = ['pending', 'dispatched', 'completed', 'callback']
const activeProperties = computed(() => (settingsStore.properties || []).filter(item => item.status === 1))
const filteredBuildingManagers = computed(() => {
  return (settingsStore.buildingManagers || []).filter(item => item.status === 1)
})
const sourceChannelOptions = computed(() => {
  const base = (settingsStore.channels || []).map(item => ({ label: item, value: `channel:${item}` }))
  const properties = activeProperties.value.map(item => ({ label: `物业：${item.name}`, value: `property:${item.id}` }))
  const buildingManagers = filteredBuildingManagers.value.map(item => ({ label: `楼管：${item.name}`, value: `buildingManager:${item.id}` }))
  return [{ label: '客户来电', value: 'customer' }, ...base, ...properties, ...buildingManagers]
})

const getReceiverRemark = () => order.value.receiverRemark || '暂无备注'
const getTechnicianName = () => order.value.technicianName || '-'
const getCustomerName = () => order.value.customerName || '-'
const getCustomerPhone = () => order.value.customerPhone || '-'
const getArea = () => order.value.area || '-'
const getAddress = () => order.value.address || '-'
const getSourceChannel = () => order.value.sourceChannel || '-'
const getProblemCategory = () => order.value.problemCategory || '-'
const getProblemDescription = () => order.value.problemDescription || '-'
const getActualWork = () => order.value.actualWork || ''
const hasFee = () => order.value.orderAmount !== undefined && order.value.orderAmount !== null
const isCompletedOrCallback = () => ['completed', 'callback'].includes(order.value.status)
const canEditConstruction = () => ['dispatched', 'completed', 'callback'].includes(order.value.status)
const canEditCallback = () => ['completed', 'callback'].includes(order.value.status)
const showConstructionForm = computed(() => editingConstruction.value || (!editingConstruction.value && order.value.status === 'dispatched'))
const constructionFormTitle = computed(() => order.value.status === 'dispatched' ? '完成工单 - 分成结算' : '编辑施工信息')
const constructionSubmitText = computed(() => order.value.status === 'dispatched' ? '完成工单' : '保存')
const constructionSavingText = computed(() => order.value.status === 'dispatched' ? '提交中...' : '保存中...')
const selectedTechnicianName = computed(() => {
  const tech = availableTechnicians.value.find(item => item.id === constructionEditForm.value.technicianId)
  return tech?.name || order.value.technicianName || '-'
})

function isStepDone(status) {
  const currentIdx = statusOrder.indexOf(order.value.status)
  const stepIdx = statusOrder.indexOf(status)
  return stepIdx < currentIdx
}

function getStepTime(status) {
  const map = {
    pending: order.value.receivedAt || order.value.createdAt,
    dispatched: order.value.dispatchedAt,
    completed: order.value.completedAt,
    callback: order.value.callbackRecord?.callbackAt
  }
  return map[status] ? formatTime(map[status]) : ''
}

function getStepOperator(status) {
  const map = {
    pending: order.value.receiverName || '系统',
    dispatched: order.value.dispatchedByName || '系统',
    completed: order.value.technicianName || '系统',
    callback: order.value.callbackRecord?.callbackByName || '系统'
  }
  return map[status] || ''
}

function getTimelineProgress() {
  const currentIdx = statusOrder.indexOf(order.value.status)
  if (currentIdx === -1) return 0
  return Math.round((currentIdx + 1) / statusOrder.length * 100)
}

function getStatusClass(status) {
  const map = {
    pending: 'pending-dispatch',
    dispatched: 'dispatched',
    completed: 'completed',
    callback: 'followed-up',
    cancelled: 'cancelled',
    consultation: 'consultation'
  }
  return map[status] || ''
}

function getStatusText(status) {
  const map = {
    pending: '待派单', dispatched: '已派单',
    completed: '已完成', callback: '已回访', cancelled: '已取消', consultation: '咨询单'
  }
  return map[status] || status
}

function getCallbackMethod(method) {
  const map = { phone: '电话', wechat: '微信', visit: '上门' }
  return map[method] || method
}

function toNumber(value) {
  const num = Number(value)
  return Number.isFinite(num) ? num : 0
}

function roundMoney(value) {
  return Math.round(toNumber(value) * 100) / 100
}

function formatShareRate(rate) {
  return `${(toNumber(rate) * 100).toFixed(2)}%`
}

function getCollectionPartyText(value) {
  const map = { technician: '师傅收款', property: '物业收款', company: '公司收款', other: '其他' }
  return map[value] || '-'
}

function getSettlementStatusText(value) {
  return value === 'settled' ? '已结' : '未结'
}

const settlementRows = computed(() => {
  const rows = [
    {
      type: 'technician',
      label: '师傅',
      name: order.value.technicianName || '-',
      rate: formatShareRate(order.value.technicianRate),
      amount: order.value.technicianAmount || 0,
      status: order.value.technicianSettlementStatus || 'unsettled'
    }
  ]

  if (order.value.propertyName || toNumber(order.value.propertyAmount) > 0) {
    rows.push({
      type: 'property',
      label: '物业',
      name: order.value.propertyName || '-',
      rate: formatShareRate(order.value.propertyRate),
      amount: order.value.propertyAmount || 0,
      status: order.value.propertySettlementStatus || 'unsettled'
    })
  }

  if (order.value.buildingManagerName || toNumber(order.value.buildingManagerAmount) > 0) {
    rows.push({
      type: 'buildingManager',
      label: '楼管',
      name: order.value.buildingManagerName || '-',
      rate: formatShareRate(order.value.buildingManagerRate),
      amount: order.value.buildingManagerAmount || 0,
      status: order.value.buildingManagerSettlementStatus || 'unsettled'
    })
  }

  return rows.map(item => ({
    ...item,
    statusText: getSettlementStatusText(item.status)
  }))
})

function getSourceSelectionValue(source) {
  if (source.sourceType === 'property' && source.sourcePropertyId) {
    return `property:${source.sourcePropertyId}`
  }
  if (source.sourceType === 'building_manager' && source.sourceBuildingManagerId) {
    return `buildingManager:${source.sourceBuildingManagerId}`
  }
  if (source.sourceChannel === '客户来电') {
    return 'customer'
  }
  return source.sourceChannel ? `channel:${source.sourceChannel}` : ''
}

function buildSourcePayload(sourceChannel) {
  if (sourceChannel === 'customer') {
    return {
      sourceType: 'customer',
      sourceChannel: '客户来电',
      sourcePropertyId: null,
      sourceBuildingManagerId: null
    }
  }

  if (sourceChannel?.startsWith('channel:')) {
    return {
      sourceType: null,
      sourceChannel: sourceChannel.slice('channel:'.length),
      sourcePropertyId: null,
      sourceBuildingManagerId: null
    }
  }

  if (sourceChannel?.startsWith('property:')) {
    return {
      sourceType: 'property',
      sourceChannel: '',
      sourcePropertyId: sourceChannel.slice('property:'.length),
      sourceBuildingManagerId: null
    }
  }

  if (sourceChannel?.startsWith('buildingManager:')) {
    return {
      sourceType: 'building_manager',
      sourceChannel: '',
      sourcePropertyId: null,
      sourceBuildingManagerId: sourceChannel.slice('buildingManager:'.length)
    }
  }

  return {
    sourceType: null,
    sourceChannel: '',
    sourcePropertyId: null,
    sourceBuildingManagerId: null
  }
}

function getDefaultCompletedAt() {
  const now = new Date()
  const pad = n => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`
}

function recalculateConstructionForm() {
  const orderAmount = toNumber(constructionEditForm.value.orderAmount)
  const materialCost = toNumber(constructionEditForm.value.materialCost)
  const shareBaseAmount = roundMoney(Math.max(orderAmount - materialCost, 0))
  const technicianRate = toNumber(constructionEditForm.value.technicianRatePercent) / 100
  const propertyRate = toNumber(constructionEditForm.value.propertyRatePercent) / 100
  const buildingManagerRate = toNumber(constructionEditForm.value.buildingManagerRatePercent) / 100
  const technicianAmount = roundMoney(shareBaseAmount * technicianRate)
  const propertyAmount = roundMoney(shareBaseAmount * propertyRate)
  const buildingManagerAmount = roundMoney(shareBaseAmount * buildingManagerRate)
  constructionEditForm.value.shareBaseAmount = shareBaseAmount
  constructionEditForm.value.technicianAmount = technicianAmount
  constructionEditForm.value.propertyAmount = propertyAmount
  constructionEditForm.value.buildingManagerAmount = buildingManagerAmount
  constructionEditForm.value.companyAmount = roundMoney(shareBaseAmount - technicianAmount - propertyAmount - buildingManagerAmount)
}

function createConstructionForm(source = {}) {
  return {
    technicianId: source.technicianId || '',
    orderAmount: toNumber(source.orderAmount),
    shareBaseAmount: toNumber(source.shareBaseAmount),
    technicianRatePercent: roundMoney(toNumber(source.technicianRate) * 100),
    technicianAmount: toNumber(source.technicianAmount),
    propertyId: source.propertyId || null,
    propertyRatePercent: roundMoney(toNumber(source.propertyRate) * 100),
    propertyAmount: toNumber(source.propertyAmount),
    buildingManagerId: source.buildingManagerId || null,
    buildingManagerRatePercent: roundMoney(toNumber(source.buildingManagerRate) * 100),
    buildingManagerAmount: toNumber(source.buildingManagerAmount),
    companyAmount: toNumber(source.companyAmount),
    collectionParty: source.collectionParty || 'technician',
    technicianSettlementStatus: source.technicianSettlementStatus || 'unsettled',
    propertySettlementStatus: source.propertySettlementStatus || 'unsettled',
    buildingManagerSettlementStatus: source.buildingManagerSettlementStatus || 'unsettled',
    receivedAmount: source.receivedAmount === null || source.receivedAmount === undefined ? toNumber(source.orderAmount) : toNumber(source.receivedAmount),
    materialCost: toNumber(source.materialCost),
    actualWork: source.actualWork || '',
    completedAt: source.completedAt ? source.completedAt.slice(0, 16) : getDefaultCompletedAt()
  }
}

function onTechnicianChange(techId) {
  const tech = availableTechnicians.value.find(t => t.id === techId)
  if (tech) {
    constructionEditForm.value.technicianRatePercent = roundMoney(toNumber(tech.commission_rate || 0.3) * 100)
  }
}

function onPropertyChange(propertyId) {
  const property = activeProperties.value.find(item => item.id === propertyId)
  constructionEditForm.value.propertyRatePercent = property ? roundMoney(toNumber(property.defaultRate) * 100) : 0
  if (property?.defaultCollectionParty) {
    constructionEditForm.value.collectionParty = property.defaultCollectionParty
  }
}

function onBuildingManagerChange(buildingManagerId) {
  const buildingManager = filteredBuildingManagers.value.find(item => item.id === buildingManagerId)
  constructionEditForm.value.buildingManagerRatePercent = buildingManager ? roundMoney(toNumber(buildingManager.defaultRate) * 100) : 0
}

function applyParticipantRateFallbacks(source = {}) {
  if (constructionEditForm.value.propertyId && !toNumber(source.propertyRate)) {
    onPropertyChange(constructionEditForm.value.propertyId)
  }
  if (constructionEditForm.value.buildingManagerId && !toNumber(source.buildingManagerRate)) {
    onBuildingManagerChange(constructionEditForm.value.buildingManagerId)
  }
}

function startEditCustomer() {
  customerEditForm.value = {
    customerName: order.value.customerName || '',
    customerPhone: order.value.customerPhone || '',
    area: order.value.area || '',
    address: order.value.address || '',
    sourceChannel: getSourceSelectionValue(order.value),
    problemCategory: order.value.problemCategory || '',
    problemDescription: order.value.problemDescription || '',
    receiverRemark: order.value.receiverRemark || ''
  }
  editingCustomer.value = true
}

function cancelEditCustomer() {
  editingCustomer.value = false
}

function validateCustomerEditForm() {
  const fields = [
    ['customerName', '请输入姓名'],
    ['customerPhone', '请输入联系方式'],
    ['area', '请选择区域'],
    ['address', '请输入住址'],
    ['sourceChannel', '请选择来源渠道'],
    ['problemCategory', '请选择问题分类'],
    ['problemDescription', '请输入问题描述']
  ]
  for (const [field, message] of fields) {
    const value = customerEditForm.value[field]
    if (!String(value || '').trim()) {
      ElMessage.warning(message)
      return false
    }
  }
  return true
}

async function saveCustomer() {
  if (!validateCustomerEditForm()) return
  customerSaving.value = true
  try {
    const sourcePayload = buildSourcePayload(customerEditForm.value.sourceChannel)
    await api.patch(`/orders/${orderId}`, {
      ...customerEditForm.value,
      ...sourcePayload
    })
    if (syncCustomerChecked.value && order.value.customerId) {
      try {
        await api.patch(`/customers/${order.value.customerId}`, {
          name: customerEditForm.value.customerName,
          phone: customerEditForm.value.customerPhone,
          area: customerEditForm.value.area,
          address: customerEditForm.value.address
        })
      } catch (e) {
        console.error('同步客户档案失败', e)
      }
    }
    ElMessage.success('客户信息已更新')
    editingCustomer.value = false
    await fetchOrderDetail()
  } catch (error) {
    ElMessage.error('保存失败')
  } finally {
    customerSaving.value = false
  }
}

function startEditConstruction() {
  constructionEditForm.value = createConstructionForm({
    technicianId: order.value.technicianId || order.value.technician_id || '',
    orderAmount: order.value.orderAmount,
    shareBaseAmount: order.value.shareBaseAmount,
    technicianRate: order.value.technicianRate ?? order.value.commissionRate,
    technicianAmount: order.value.technicianAmount ?? order.value.serviceFee,
    propertyId: order.value.propertyId,
    propertyRate: order.value.propertyRate,
    propertyAmount: order.value.propertyAmount,
    buildingManagerId: order.value.buildingManagerId,
    buildingManagerRate: order.value.buildingManagerRate,
    buildingManagerAmount: order.value.buildingManagerAmount,
    companyAmount: order.value.companyAmount,
    collectionParty: order.value.collectionParty,
    technicianSettlementStatus: order.value.technicianSettlementStatus,
    propertySettlementStatus: order.value.propertySettlementStatus,
    buildingManagerSettlementStatus: order.value.buildingManagerSettlementStatus,
    receivedAmount: order.value.receivedAmount ?? order.value.receivedFee,
    materialCost: order.value.materialCost,
    actualWork: order.value.actualWork,
    completedAt: order.value.completedAt
  })
  applyParticipantRateFallbacks(order.value)
  recalculateConstructionForm()
  editingConstruction.value = true
}

async function completeOrderDirectly() {
  if (order.value.status === 'dispatched') {
    startEditConstruction()
  } else {
    startEditConstruction()
  }
}

function cancelEditConstruction() {
  editingConstruction.value = false
}

async function saveConstruction() {
  constructionSaving.value = true
  try {
    const payload = {
      technicianId: constructionEditForm.value.technicianId || null,
      orderAmount: roundMoney(constructionEditForm.value.orderAmount),
      technicianRate: toNumber(constructionEditForm.value.technicianRatePercent) / 100,
      propertyId: constructionEditForm.value.propertyId || null,
      propertyRate: toNumber(constructionEditForm.value.propertyRatePercent) / 100,
      buildingManagerId: constructionEditForm.value.buildingManagerId || null,
      buildingManagerRate: toNumber(constructionEditForm.value.buildingManagerRatePercent) / 100,
      receivedAmount: roundMoney(constructionEditForm.value.receivedAmount),
      materialCost: roundMoney(constructionEditForm.value.materialCost),
      collectionParty: constructionEditForm.value.collectionParty,
      technicianSettlementStatus: constructionEditForm.value.technicianSettlementStatus,
      propertySettlementStatus: constructionEditForm.value.propertySettlementStatus,
      buildingManagerSettlementStatus: constructionEditForm.value.buildingManagerSettlementStatus,
      actualWork: constructionEditForm.value.actualWork,
      completedAt: constructionEditForm.value.completedAt
    }
    if (payload.completedAt) {
      payload.completedAt = new Date(payload.completedAt).toISOString()
    }
    await api.post(`/orders/${orderId}/fee`, payload)
    if (order.value.status === 'dispatched') {
      await api.patch(`/orders/${orderId}/status`, { status: 'completed', completedAt: payload.completedAt })
    }
    ElMessage.success('施工信息已保存')
    editingConstruction.value = false
    await fetchOrderDetail()
  } catch (error) {
    ElMessage.error('保存失败')
  } finally {
    constructionSaving.value = false
  }
}

function startCompleteOrder() {
  startEditConstruction()
}

function startEditCallback() {
  if (order.value.callbackRecord) {
    callbackEditForm.value = {
      isSatisfied: order.value.callbackRecord.isSatisfied,
      satisfactionScore: order.value.callbackRecord.satisfactionScore || 5,
      feeConsistent: order.value.callbackRecord.feeConsistent,
      callbackMethod: order.value.callbackRecord.callbackMethod || 'phone',
      otherFeedback: order.value.callbackRecord.otherFeedback || ''
    }
  } else {
    callbackEditForm.value = {
      isSatisfied: true,
      satisfactionScore: 5,
      feeConsistent: true,
      callbackMethod: 'phone',
      otherFeedback: ''
    }
  }
  editingCallback.value = true
}

function cancelEditCallback() {
  editingCallback.value = false
}

async function saveCallback() {
  callbackSaving.value = true
  try {
    await api.post(`/orders/${orderId}/callback`, callbackEditForm.value)
    ElMessage.success('回访信息已保存')
    editingCallback.value = false
    await fetchOrderDetail()
  } catch (error) {
    ElMessage.error('保存失败')
  } finally {
    callbackSaving.value = false
  }
}

async function fetchOrderDetail() {
  try {
    const response = await api.get(`/orders/${orderId}`)
    order.value = response.data
    constructionEditForm.value = createConstructionForm({
      technicianId: order.value.technicianId || order.value.technician_id || '',
      orderAmount: order.value.orderAmount,
      shareBaseAmount: order.value.shareBaseAmount,
      technicianRate: order.value.technicianRate ?? order.value.commissionRate,
      technicianAmount: order.value.technicianAmount ?? order.value.serviceFee,
      propertyId: order.value.propertyId,
      propertyRate: order.value.propertyRate,
      propertyAmount: order.value.propertyAmount,
      buildingManagerId: order.value.buildingManagerId,
      buildingManagerRate: order.value.buildingManagerRate,
      buildingManagerAmount: order.value.buildingManagerAmount,
      companyAmount: order.value.companyAmount,
      collectionParty: order.value.collectionParty,
      technicianSettlementStatus: order.value.technicianSettlementStatus,
      propertySettlementStatus: order.value.propertySettlementStatus,
      buildingManagerSettlementStatus: order.value.buildingManagerSettlementStatus,
      receivedAmount: order.value.receivedAmount ?? order.value.receivedFee,
      materialCost: order.value.materialCost,
      actualWork: order.value.actualWork,
      completedAt: order.value.completedAt
    })
    applyParticipantRateFallbacks(order.value)
    recalculateConstructionForm()
    if (order.value.customerId || order.value.customerPhone) {
      fetchCustomerOrders()
    }
  } catch (error) {
    ElMessage.error('获取工单详情失败')
    console.error(error)
  }
}

async function fetchCustomerOrders() {
  try {
    const params = {}
    if (order.value.customerId) params.customerId = order.value.customerId
    if (order.value.customerPhone) params.customerPhone = order.value.customerPhone
    const response = await api.get('/orders', { params: { ...params, pageSize: 50 } })
    customerOrders.value = (response.data.items || response.data || []).filter(o => o.id !== order.value.id)
  } catch (error) {
    console.error('获取客户历史工单失败')
  }
}

async function fetchTechnicians() {
  try {
    const response = await api.get('/technicians', { params: { status: 'active', pageSize: 100 } })
    availableTechnicians.value = response.data.items || response.data || []
  } catch (error) {
    console.error('获取师傅列表失败')
  }
}

async function assignOrder() {
  if (!selectedTechnician.value) {
    ElMessage.warning('请选择师傅')
    return
  }
  assignLoading.value = true
  try {
    await api.post(`/orders/${orderId}/assign`, {
      technicianId: selectedTechnician.value,
      remark: dispatchRemark.value
    })
    ElMessage.success('派单成功')
    showDispatchDialog.value = false
    await fetchOrderDetail()
  } catch (error) {
    ElMessage.error('派单失败')
  } finally {
    assignLoading.value = false
  }
}

async function convertToFormal() {
  try {
    await ElMessageBox.confirm('确定要将此咨询单转为正式单吗？转为正式单后将进入待派单状态。', '转正式单', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    await api.patch(`/orders/${orderId}/convert`)
    ElMessage.success('咨询单已转为正式单，当前状态为待派单')
    await fetchOrderDetail()
  } catch (e) {
    // cancelled
  }
}

async function cancelOrder() {
  try {
    const { value } = await ElMessageBox.prompt('请输入取消原因', '取消工单', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      inputPattern: /.+/,
      inputErrorMessage: '取消原因不能为空'
    })
    await api.patch(`/orders/${orderId}/cancel`, { cancelReason: value })
    ElMessage.success('工单已取消')
    await fetchOrderDetail()
  } catch (e) {
  }
}

async function confirmDeleteOrder() {
  try {
    await confirmDelete({
      title: '确认删除工单',
      message: `确定要删除工单 <strong>${order.value.orderNo}</strong> 吗？删除后数据将无法恢复。`
    })
    await api.delete(`/orders/${orderId}`)
    ElMessage.success('工单已删除')
    router.push('/orders')
  } catch (e) {
    if (e !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

watch(
  () => [
    constructionEditForm.value.orderAmount,
    constructionEditForm.value.technicianRatePercent,
    constructionEditForm.value.propertyRatePercent,
    constructionEditForm.value.buildingManagerRatePercent,
    constructionEditForm.value.materialCost
  ],
  () => {
    recalculateConstructionForm()
  }
)

onMounted(async () => {
  if (!settingsStore.loaded) {
    await settingsStore.fetchAll()
  }
  await fetchTechnicians()
  await fetchOrderDetail()
})
</script>

<style scoped lang="scss">
.order-detail-page {
  position: relative;
  z-index: 1;
}

.detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 12px;
}
.detail-header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}
.btn-back {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 18px;
  border-radius: 999px;
  border: none;
  background: rgba(74,127,181,0.08);
  color: var(--primary);
  font-family: var(--font-body);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  text-decoration: none;
}
.btn-back:hover {
  background: rgba(74,127,181,0.15);
  transform: translateX(-2px);
}
.btn-back svg { width: 16px; height: 16px; stroke-width: 2; }
.order-number {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 18px;
  color: var(--fg);
}
.status-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 26px;
  padding: 0 14px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
}
.status-pill.pending-dispatch {
  background: rgba(74,127,181,0.12);
  color: #3D6A9A;
}
.status-pill.dispatched {
  background: rgba(232,184,75,0.12);
  color: #9A7A1F;
}
.status-pill.completed {
  background: rgba(74,127,181,0.12);
  color: #3D6A9A;
}
.status-pill.followed-up {
  background: rgba(74,127,181,0.1);
  color: #4A7FB5;
}
.status-pill.cancelled {
  background: rgba(212,114,106,0.1);
  color: #D4726A;
}
.status-pill.consultation {
  background: rgba(120,120,108,0.15);
  color: #78786C;
}
.status-pill.completed svg { width: 14px; height: 14px; }
.detail-header-right {
  display: flex;
  align-items: center;
  gap: 10px;
}
.header-action-btn {
  width: auto;
  margin-bottom: 0 !important;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.btn-outline {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 36px;
  padding: 0 20px;
  border-radius: 999px;
  background: transparent;
  font-family: var(--font-body);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
  border: 1.5px solid transparent;
}
.btn-outline svg { width: 16px; height: 16px; stroke-width: 2; }
.btn-outline.primary {
  border-color: var(--primary);
  color: var(--primary);
}
.btn-outline.primary:hover {
  background: rgba(74,127,181,0.08);
}
.btn-outline.danger {
  border-color: var(--destructive);
  color: var(--destructive);
}
.btn-outline.danger:hover {
  background: rgba(212,114,106,0.08);
}
.btn-outline.gray {
  border-color: var(--border);
  color: var(--muted-fg);
}
.btn-outline.gray:hover {
  background: rgba(230,220,205,0.4);
}
.btn-followup {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  height: 36px;
  padding: 0 20px;
  border-radius: 999px;
  border: 1.5px solid var(--primary);
  background: var(--primary);
  color: white;
  font-family: var(--font-body);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: var(--shadow-soft);
  transition: all 0.2s ease;
  margin-bottom: 16px;
}
.btn-followup:hover {
  background: #3D6FA0;
  border-color: #3D6FA0;
  box-shadow: var(--shadow-soft);
}
.btn-followup svg { width: 16px; height: 16px; stroke-width: 2; }

.timeline-section {
  background: var(--card-bg);
  border: 1px solid rgba(222,216,207,0.5);
  border-radius: 24px;
  box-shadow: var(--shadow-soft);
  padding: 24px 32px;
  margin-bottom: 24px;
  overflow-x: auto;
}
.timeline-track {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  min-width: 600px;
  position: relative;
  padding-top: 20px;
}
.timeline-line {
  position: absolute;
  top: 30px;
  left: 40px;
  right: 40px;
  height: 3px;
  background: var(--border);
  z-index: 0;
}
.timeline-line-fill {
  position: absolute;
  top: 0; left: 0;
  height: 100%;
  background: var(--primary);
  border-radius: 3px;
}
.timeline-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  z-index: 1;
  flex: 1;
}
.timeline-node {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 10px;
  transition: all 0.3s ease;
}
.timeline-node.done {
  background: #5BA882;
  box-shadow: 0 2px 8px rgba(91,168,130,0.3);
}
.timeline-node.done svg { width: 12px; height: 12px; stroke: white; stroke-width: 3; fill: none; }
.timeline-node.current {
  background: var(--primary);
  box-shadow: 0 0 0 4px rgba(74,127,181,0.2);
  animation: pulse-ring 2s ease-in-out infinite;
}
.timeline-node.current svg { width: 10px; height: 10px; fill: white; }
.timeline-node.pending {
  background: var(--border);
}
.timeline-node.pending svg { width: 10px; height: 10px; fill: var(--muted-fg); }
@keyframes pulse-ring {
  0%, 100% { box-shadow: 0 0 0 4px rgba(74,127,181,0.2); }
  50% { box-shadow: 0 0 0 8px rgba(74,127,181,0.08); }
}
.timeline-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--fg);
  margin-bottom: 4px;
  white-space: nowrap;
}
.timeline-step.pending .timeline-label { color: var(--muted-fg); }
.timeline-meta {
  font-size: 11px;
  color: var(--muted-fg);
  white-space: nowrap;
}

.info-cards-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 20px;
  margin-bottom: 24px;
  align-items: stretch;
}
@media (max-width: 1100px) {
  .info-cards-grid { grid-template-columns: 1fr; }
}
@media (max-width: 720px) {
  .info-cards-grid { grid-template-columns: 1fr; }
}
.info-card {
  background: var(--card-bg);
  border: 1px solid rgba(222,216,207,0.5);
  border-radius: 24px;
  box-shadow: var(--shadow-soft);
  padding: 24px;
  transition: all 0.3s ease;
  height: 100%;
  box-sizing: border-box;
}
.info-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-hover);
}
.info-card:nth-child(1) { border-radius: 24px 16px 24px 16px; }
.info-card:nth-child(2) { border-radius: 16px 24px 16px 24px; }
.info-card:nth-child(3) { border-radius: 24px 24px 16px 16px; }
.callback-info-card {
  grid-column: 1 / -1;
  padding-bottom: 22px;
}
.card-title {
  font-family: var(--font-display);
  font-weight: 600;
  font-size: 16px;
  color: var(--fg);
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.card-title svg { width: 20px; height: 20px; stroke: var(--primary); stroke-width: 2; fill: none; }

.card-edit-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: var(--muted-fg);
  cursor: pointer;
  transition: all 0.3s ease;
  flex-shrink: 0;
}
.card-edit-btn:hover {
  background: rgba(74,127,181,0.1);
  color: var(--primary);
}

.field-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.field-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 13px;
  line-height: 1.5;
}
.field-label {
  color: #B8A472;
  font-weight: 500;
  min-width: 72px;
  flex-shrink: 0;
}
.required-mark {
  color: var(--destructive);
  margin-left: 2px;
}
.field-value {
  color: #5C4A32;
  font-weight: 500;
  word-break: break-all;
}
.field-value.empty {
  color: var(--muted-fg);
  font-style: italic;
  opacity: 0.6;
}
.category-pill {
  display: inline-flex;
  align-items: center;
  height: 28px;
  padding: 0 12px;
  border-radius: 999px;
  background: rgba(74,127,181,0.1);
  color: var(--primary);
  font-size: 12px;
  font-weight: 600;
  gap: 6px;
}

.pill-input,
.pill-select {
  width: 100%;
  height: 40px;
  padding: 0 16px;
  border-radius: 999px;
  border: 1px solid rgba(222,216,207,0.8);
  background: rgba(255,255,255,0.5);
  font-family: var(--font-body);
  font-size: 14px;
  color: var(--fg);
  outline: none;
  transition: all 0.2s ease;
  -webkit-appearance: none;
  appearance: none;
}
.pill-select {
  background-image: url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1.5L6 6.5L11 1.5' stroke='%2378786C' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 14px center;
  padding-right: 36px;
  cursor: pointer;
}
.pill-input:focus,
.pill-select:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(74,127,181,0.15);
  background: rgba(255,255,255,0.8);
}
.pill-textarea {
  width: 100%;
  min-height: 72px;
  padding: 12px 16px;
  border-radius: 16px;
  border: 1px solid rgba(222,216,207,0.8);
  background: rgba(255,255,255,0.5);
  font-family: var(--font-body);
  font-size: 14px;
  color: var(--fg);
  outline: none;
  transition: all 0.2s ease;
  resize: vertical;
  line-height: 1.6;
}
.pill-textarea:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(74,127,181,0.15);
  background: rgba(255,255,255,0.8);
}

.form-group {
  margin-bottom: 14px;
}
.form-label {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: var(--muted-fg);
  margin-bottom: 6px;
}
.form-grid-2col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.customer-edit-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 12px;
  border-top: 1px solid var(--border);
  margin-top: 12px;
}
.sync-checkbox {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--muted-fg);
  cursor: pointer;
}
.sync-checkbox input {
  accent-color: var(--primary);
  width: 14px;
  height: 14px;
  cursor: pointer;
}
.customer-edit-actions {
  display: flex;
  gap: 8px;
}

.complete-order-form {
  background: rgba(74,127,181,0.06);
  border-radius: 16px;
  padding: 16px;
  margin-bottom: 16px;
  border: 1px dashed rgba(74,127,181,0.3);
}
.complete-order-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--primary);
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
}
.complete-order-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  margin-top: 8px;
}

.construction-form-section {
  padding: 14px 0;
  border-top: 1px solid rgba(222,216,207,0.55);
}

.construction-form-section:first-of-type {
  border-top: none;
  padding-top: 0;
}

.construction-section-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--fg);
  margin-bottom: 12px;
}

.construction-form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  column-gap: 12px;
}

.construction-form-grid .full-span {
  grid-column: 1 / -1;
}

.readonly-field {
  opacity: 0.66;
  cursor: not-allowed;
  background: rgba(245, 242, 236, 0.72);
}

.share-edit-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}

.share-edit-table th {
  text-align: left;
  padding: 8px 8px;
  font-size: 12px;
  font-weight: 600;
  color: var(--muted-fg);
  border-bottom: 1px solid rgba(222,216,207,0.7);
}

.share-edit-table td {
  padding: 9px 8px;
  font-size: 13px;
  color: var(--fg);
  border-bottom: 1px solid rgba(222,216,207,0.35);
  vertical-align: middle;
}

.share-edit-table th:first-child,
.share-edit-table td:first-child {
  padding-left: 0;
  width: 38%;
}

.share-edit-table th:nth-child(2),
.share-edit-table td:nth-child(2) {
  width: 22%;
  text-align: left;
}

.share-edit-table th:nth-child(3),
.share-edit-table td:nth-child(3) {
  width: 16%;
  text-align: center;
}

.share-edit-table th:nth-child(4),
.share-edit-table td:nth-child(4) {
  width: 24%;
  text-align: center;
}

.share-edit-table th:last-child,
.share-edit-table td:last-child {
  padding-right: 0;
}

.table-input {
  width: 100%;
  height: 34px;
  padding: 0 10px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: rgba(255,255,255,0.65);
  color: var(--fg);
  font-family: var(--font-body);
  font-size: 13px;
  box-sizing: border-box;
}

.table-input:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(74,127,181,0.12);
}

.table-select-el {
  width: 100%;
}

.share-party-cell {
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 6px;
}

.share-party-name {
  color: var(--fg);
  font-size: 13px;
  font-weight: 650;
  line-height: 1.35;
  word-break: break-word;
}

.share-party-select :deep(.el-select__wrapper) {
  min-height: 34px !important;
  height: 34px !important;
  border-radius: 8px !important;
  background: rgba(255,255,255,0.65) !important;
  box-shadow: 0 0 0 1px var(--border) inset !important;
}

.share-amount-text {
  display: block;
  color: var(--fg);
  font-family: var(--font-body);
  font-size: 13px;
  font-weight: 500;
  text-align: center;
  white-space: nowrap;
}

.settlement-switch-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-height: 34px;
}

.settlement-switch {
  flex: 0 0 auto;
}

.settlement-switch-label {
  min-width: 28px;
  color: var(--muted-fg);
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
}

.settlement-switch-label.settled {
  color: #4c8f6d;
}

.settlement-not-applicable {
  color: rgba(142, 132, 116, 0.72);
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
}

.cost-table {
  width: 100%;
  border-collapse: collapse;
  margin: 12px 0;
}
.cost-table tr { border-bottom: 1px solid rgba(222,216,207,0.3); }
.cost-table tr:last-child { border-bottom: none; }
.cost-table td {
  padding: 7px 0;
  font-size: 13px;
  color: var(--fg);
}
.cost-table .cost-label {
  color: var(--muted-fg);
  font-weight: 500;
  width: 55%;
}
.cost-table .cost-value {
  text-align: right;
  font-weight: 600;
}
.cost-total-value {
  font-family: var(--font-display);
  font-size: 20px;
  color: var(--primary);
  font-weight: 700;
}

.settlement-summary {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin: 12px 0;
}

.settlement-summary-item {
  border: 1px solid rgba(222,216,207,0.5);
  border-radius: 8px;
  padding: 10px 12px;
  background: rgba(253,252,248,0.55);
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.settlement-summary-item span {
  font-size: 12px;
  color: var(--muted-fg);
}

.settlement-summary-item strong {
  font-family: var(--font-display);
  font-size: 18px;
  color: var(--fg);
}

.settlement-summary-item.primary strong {
  color: var(--primary);
  font-size: 22px;
}

.settlement-table {
  width: 100%;
  border-collapse: collapse;
  margin: 12px 0;
}

.settlement-table th {
  text-align: left;
  font-size: 12px;
  color: var(--muted-fg);
  font-weight: 600;
  padding: 8px 0;
  border-bottom: 1px solid rgba(222,216,207,0.65);
}

.settlement-table td {
  padding: 9px 0;
  font-size: 13px;
  color: var(--fg);
  border-bottom: 1px solid rgba(222,216,207,0.35);
}

.settlement-name {
  display: block;
  font-weight: 600;
}

.settlement-type {
  display: block;
  margin-top: 2px;
  font-size: 11px;
  color: var(--muted-fg);
}

.settlement-status {
  display: inline-flex;
  align-items: center;
  height: 24px;
  padding: 0 8px;
  border-radius: 999px;
  background: rgba(180, 84, 74, 0.1);
  color: var(--destructive);
  font-size: 12px;
  font-weight: 600;
}

.settlement-status.settled {
  background: rgba(91, 168, 130, 0.12);
  color: #4C8F6D;
}

.worker-link {
  color: var(--primary);
  font-weight: 600;
  cursor: pointer;
  transition: color 0.3s ease;
  text-decoration: none;
}
.worker-link:hover { color: #3D6A9A; text-decoration: underline; }

.edit-form {
  display: flex;
  flex-direction: column;
  gap: 0;
}
.edit-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--border);
}

.followup-alert {
  background: rgba(232,184,75,0.15);
  border-radius: 16px;
  padding: 14px 16px;
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
  font-size: 13px;
  color: #9A7A1F;
  font-weight: 500;
}
.followup-alert .alert-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--secondary);
  flex-shrink: 0;
  animation: blink-dot 1.5s ease-in-out infinite;
}
@keyframes blink-dot {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

.callback-empty-state {
  text-align: center;
  padding: 18px 0 8px;
  color: var(--muted-fg);
  font-size: 13px;
}
.callback-empty-state svg {
  display: block;
  margin: 0 auto 8px;
  opacity: 0.3;
}

.callback-summary-grid {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 12px;
}

.callback-summary-item,
.callback-summary-note {
  border: 1px solid rgba(222,216,207,0.5);
  border-radius: 12px;
  background: rgba(253,252,248,0.58);
  padding: 12px 14px;
  min-width: 0;
}

.callback-summary-item {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.callback-summary-item.primary {
  background: rgba(91,168,130,0.1);
  border-color: rgba(91,168,130,0.2);
}

.callback-summary-label {
  font-size: 12px;
  color: var(--muted-fg);
  font-weight: 600;
}

.callback-summary-item strong,
.callback-summary-value {
  color: var(--fg);
  font-size: 14px;
  font-weight: 700;
  min-width: 0;
  word-break: break-word;
}

.callback-summary-note {
  grid-column: 1 / -1;
}

.callback-summary-note p {
  margin: 6px 0 0;
  color: var(--fg);
  font-size: 13px;
  line-height: 1.6;
}

.callback-edit-form {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  column-gap: 16px;
}

.callback-edit-form .form-group:last-of-type,
.callback-edit-form .edit-actions {
  grid-column: 1 / -1;
}

.no-data {
  text-align: center;
  padding: 24px 0;
  color: var(--muted-fg);
  font-size: 13px;
}
.no-data svg {
  display: block;
  margin: 0 auto 8px;
  opacity: 0.3;
}

.star-rating {
  display: flex;
  gap: 4px;
}
.star-rating .star {
  width: 24px;
  height: 24px;
  cursor: pointer;
  transition: all 0.2s ease;
  color: var(--border);
}
.star-rating .star:hover { transform: scale(1.2); }
.star-rating .star.filled { color: var(--secondary); }

.radio-group {
  display: flex;
  gap: 24px;
  align-items: center;
}
.radio-item {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  color: var(--fg);
}
.radio-item input[type="radio"] {
  width: 18px;
  height: 18px;
  border: 2px solid var(--border);
  background: transparent;
  accent-color: var(--primary);
  cursor: pointer;
}

.stars { color: var(--secondary); letter-spacing: 1px; }
.stars-gray { color: var(--muted-fg); opacity: 0.4; }
.rating-score {
  font-weight: 600;
  color: var(--secondary);
  margin-left: 4px;
}
.pending-tag {
  font-size: 12px;
  color: var(--muted-fg);
  font-style: italic;
}

.history-section {
  background: var(--card-bg);
  border: 1px solid rgba(222,216,207,0.5);
  border-radius: 24px;
  box-shadow: var(--shadow-soft);
  padding: 24px;
  overflow: hidden;
}

@media (max-width: 1200px) {
  .callback-summary-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 720px) {
  .callback-summary-grid,
  .callback-edit-form {
    grid-template-columns: 1fr;
  }
}
.history-header {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 16px;
}
.history-title {
  font-family: var(--font-display);
  font-weight: 600;
  font-size: 16px;
  color: var(--fg);
}
.history-subtitle {
  font-size: 12px;
  color: var(--muted-fg);
  font-weight: 500;
}
.history-table {
  width: 100%;
  border-collapse: collapse;
}
.history-table thead th {
  padding: 10px 14px;
  font-size: 12px;
  font-weight: 600;
  color: var(--muted-fg);
  text-align: left;
  border-bottom: 1px solid var(--border);
  background: transparent;
  white-space: nowrap;
}
.history-table tbody td {
  padding: 12px 14px;
  font-size: 13px;
  color: var(--fg);
  border-bottom: 1px solid rgba(222,216,207,0.25);
  white-space: nowrap;
}
.history-table tbody tr:last-child td { border-bottom: none; }
.history-table tbody tr {
  transition: background 0.3s ease;
}
.history-table tbody tr:hover { background: rgba(240,235,229,0.4); }
.history-order-id {
  font-weight: 600;
  color: var(--primary);
  cursor: pointer;
  transition: color 0.3s ease;
}
.history-order-id:hover { text-decoration: underline; color: #3D6A9A; }

.dispatch-form {
  padding: 8px 0;
}
.dispatch-section h4 {
  font-family: var(--font-display);
  font-weight: 600;
  font-size: 15px;
  color: var(--fg);
  margin-bottom: 12px;
}
.technician-cards {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 320px;
  overflow-y: auto;
}
.tech-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 16px;
  border: 1px solid rgba(222,216,207,0.5);
  cursor: pointer;
  transition: all 0.2s ease;
}
.tech-card:hover {
  background: rgba(74,127,181,0.05);
  border-color: rgba(74,127,181,0.3);
}
.tech-card.selected {
  background: rgba(74,127,181,0.08);
  border-color: var(--primary);
  box-shadow: 0 0 0 2px rgba(74,127,181,0.15);
}
.tech-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--primary);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 16px;
  flex-shrink: 0;
}
.tech-info {
  flex: 1;
}
.tech-name {
  font-weight: 600;
  font-size: 14px;
  color: var(--fg);
}
.tech-specialty {
  font-size: 12px;
  color: var(--muted-fg);
  margin-top: 2px;
}
.tech-status {
  flex-shrink: 0;
}
</style>

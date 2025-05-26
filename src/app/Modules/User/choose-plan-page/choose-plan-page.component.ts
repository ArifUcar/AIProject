import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { PlanService } from '../../../Core/Services/PlanService/plan.service';
import { PlanResponse } from '../../../Model/Entity/Response/Plan.Response';

@Component({
  selector: 'app-choose-plan-page',
  standalone: true,
  imports: [CommonModule, DialogModule, ButtonModule],
  templateUrl: './choose-plan-page.component.html',
  styleUrl: './choose-plan-page.component.scss'
})
export class ChoosePlanPageComponent implements OnInit {
  @ViewChild('confirmationSection') confirmationSection!: ElementRef;
  
  plans: PlanResponse[] = [];
  loading: boolean = true;
  showConfirmDialog = false;
  selectedPlan: any = null;

  constructor(private planService: PlanService) {}

  ngOnInit(): void {
    this.loadPlans();
  }

  loadPlans(): void {
    this.loading = true;
    this.planService.getActivePlans().subscribe({
      next: (plans) => {
        this.plans = plans;
        this.loading = false;
      },
      error: (error) => {
        console.error('Planlar yüklenirken hata oluştu:', error);
        alert('Planlar yüklenirken bir hata oluştu.');
        this.loading = false;
      }
    });
  }

  // Plan limitlerini periyoda göre hesapla
  calculatePeriodLimits(plan: any): any {
    // Plan tipini belirle
    const isWeekly = plan.name.toLowerCase().includes('haftalık');
    const isMonthly = plan.name.toLowerCase().includes('aylık');
    const isYearly = plan.name.toLowerCase().includes('yıllık');

    let limits = {
      inputTokenLimit: 0,
      outputTokenLimit: 0,
      imageLimit: 0,
      audioMinutesLimit: 0,
      period: ''
    };

    if (isWeekly) {
      limits = {
        inputTokenLimit: plan.weeklyInputTokenLimit,
        outputTokenLimit: plan.weeklyOutputTokenLimit,
        imageLimit: plan.weeklyImageLimit,
        audioMinutesLimit: plan.weeklyAudioMinutesLimit,
        period: 'haftalık'
      };
    } else if (isMonthly) {
      limits = {
        inputTokenLimit: plan.monthlyInputTokenLimit,
        outputTokenLimit: plan.monthlyOutputTokenLimit,
        imageLimit: plan.monthlyImageLimit,
        audioMinutesLimit: plan.monthlyAudioMinutesLimit,
        period: 'aylık'
      };
    } else if (isYearly) {
      limits = {
        inputTokenLimit: plan.yearlyInputTokenLimit,
        outputTokenLimit: plan.yearlyOutputTokenLimit,
        imageLimit: plan.yearlyImageLimit,
        audioMinutesLimit: plan.yearlyAudioMinutesLimit,
        period: 'yıllık'
      };
    }

    return limits;
  }

  // Periyoda göre limit gösterimi
  getPeriodLimitText(plan: any, limitType: string): string {
    const limits = this.calculatePeriodLimits(plan);
    
    switch(limitType) {
      case 'input':
        return limits.inputTokenLimit > 0 ? 
          `${limits.period} ${limits.inputTokenLimit.toLocaleString()} giriş tokeni` : '';
      case 'output':
        return limits.outputTokenLimit > 0 ? 
          `${limits.period} ${limits.outputTokenLimit.toLocaleString()} çıkış tokeni` : '';
      case 'image':
        return limits.imageLimit > 0 ? 
          `${limits.period} ${limits.imageLimit} görsel` : '';
      case 'audio':
        return limits.audioMinutesLimit > 0 ? 
          `${limits.period} ${limits.audioMinutesLimit} dakika ses` : '';
      default:
        return '';
    }
  }

  selectPlan(plan: any) {
    this.selectedPlan = plan;
    this.showConfirmDialog = true;

    setTimeout(() => {
      if (this.confirmationSection) {
        const element = this.confirmationSection.nativeElement;
        const elementRect = element.getBoundingClientRect();
        const absoluteElementTop = elementRect.top + window.pageYOffset;
        
        window.scrollTo({
          top: absoluteElementTop,
          behavior: 'smooth'
        });
      }
    }, 300);
  }

  hideDialog() {
    this.showConfirmDialog = false;
    this.selectedPlan = null;
  }

  confirmPlanSelection() {
    // Plan seçim onayı işlemleri
    this.hideDialog();
  }
}


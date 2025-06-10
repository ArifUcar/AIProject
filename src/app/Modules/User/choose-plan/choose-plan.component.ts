import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil, finalize } from 'rxjs';

// PrimeNG Imports
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { BadgeModule } from 'primeng/badge';
import { ChipModule } from 'primeng/chip';
import { DividerModule } from 'primeng/divider';
import { SkeletonModule } from 'primeng/skeleton';
import { MessageModule } from 'primeng/message';
import { TagModule } from 'primeng/tag';
import { PanelModule } from 'primeng/panel';
import { FieldsetModule } from 'primeng/fieldset';
import { RippleModule } from 'primeng/ripple';
import { TooltipModule } from 'primeng/tooltip';
import { PlanService } from '../../../Core/Services/PlanService/plan.service';
import { PlanResponse } from '../../../Model/Entity/Plan/Plan.Response';

interface PlanCard {
  id: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  duration: number;
  discountRate?: number | null;
  colorCode: string;
  isPopular: boolean;
  features: string[];
  models: string[];
  limits: {
    tokens: string;
    images: string;
    audio: string;
  };
}

@Component({
  selector: 'app-choose-plan',
  standalone: true,
  imports: [
    CommonModule, CardModule, ButtonModule, BadgeModule, ChipModule,
    DividerModule, SkeletonModule, MessageModule, TagModule, PanelModule,
    FieldsetModule, RippleModule, TooltipModule
  ],
  templateUrl: './choose-plan.component.html',
  styleUrl: './choose-plan.component.scss'
})
export class ChoosePlanComponent implements OnInit, OnDestroy {
  plans: PlanCard[] = [];
  isLoading = false;
  errorMessage = '';
  selectedPlanId: string | null = null;

  private destroy$ = new Subject<void>();

  constructor(private planService: PlanService) {}

  ngOnInit() {
    this.loadPlans();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadPlans() {
    this.isLoading = true;
    this.errorMessage = '';

    this.planService.getActivePlans()
      .pipe(takeUntil(this.destroy$), finalize(() => this.isLoading = false))
      .subscribe({
        next: (plans: PlanResponse[]) => this.plans = this.mapPlansToCards(plans),
        error: () => {
          this.errorMessage = 'Planlar yüklenirken hata oluştu.';
        }
      });
  }

  private mapPlansToCards(plans: PlanResponse[]): PlanCard[] {
    return plans
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .map(plan => ({
        id: plan.id,
        name: plan.name,
        description: plan.description,
        price: plan.price,
        originalPrice: plan.discountRate ? plan.price / (1 - plan.discountRate / 100) : undefined,
        duration: plan.duration,
        discountRate: plan.discountRate,
        colorCode: plan.colorCode,
        isPopular: plan.name.toLowerCase().includes('mid'),
        features: this.generateFeatures(plan),
        models: this.parseModels((plan as any).model || plan.models),
        limits: this.generateLimits(plan)
      }));
  }

  private generateFeatures(plan: PlanResponse): string[] {
    const modelCount = this.parseModels((plan as any).model || plan.models).length;
    const features = [`${modelCount} AI Model`];
    
    const supportType = plan.name.toLowerCase().includes('kurumsal') ? 'Öncelikli Destek' :
                       plan.price === 0 ? 'Temel Destek' : 'Standart Destek';
    features.push(supportType);
    
    if (plan.discountRate) features.push(`%${plan.discountRate} İndirim`);
    return features;
  }

  private generateLimits(plan: PlanResponse): { tokens: string; images: string; audio: string } {
    const formatLimit = (value: number, divisor: number, unit: string) => 
      `${(value / divisor).toLocaleString('tr-TR')}${unit}`;

    const tokens = plan.monthlyInputTokenLimit > 0 
      ? formatLimit(plan.monthlyInputTokenLimit, 1000, 'K token/ay')
      : plan.yearlyInputTokenLimit > 0 
        ? formatLimit(plan.yearlyInputTokenLimit, 1000000, 'M token/yıl')
        : 'Sınırsız';

    const images = plan.monthlyImageLimit > 0 
      ? `${plan.monthlyImageLimit} resim/ay`
      : plan.yearlyImageLimit > 0 
        ? `${plan.yearlyImageLimit} resim/yıl`
        : 'Dahil Değil';

    const audio = plan.monthlyAudioMinutesLimit > 0 
      ? `${plan.monthlyAudioMinutesLimit} dk/ay`
      : 'Dahil Değil';

    return { tokens, images, audio };
  }

  private parseModels(modelsData: any): string[] {
    try {
      return Array.isArray(modelsData) ? modelsData : JSON.parse(modelsData || '[]');
    } catch {
      return [];
    }
  }



  onSelectPlan(planId: string) {
    this.selectedPlanId = planId;
    console.log('Seçilen plan:', this.plans.find(p => p.id === planId));
  }

  getDurationText(duration: number): string {
    const texts = { 1: 'Haftalık', 2: 'Aylık', 3: 'Yıllık' };
    return texts[duration as keyof typeof texts] || 'Bilinmiyor';
  }

  getFormattedPrice(price: number): string {
    return price === 0 ? 'Ücretsiz' : `₺${price.toLocaleString('tr-TR')}`;
  }

  getModelDisplayName(model: string): string {
    const names: { [key: string]: string } = {
      'gemini-2.0-flash': 'Gemini 2.0', 'gpt-3.5-turbo': 'GPT-3.5', 'gpt-4o-mini': 'GPT-4o Mini',
      'claude-3-5-sonnet': 'Claude 3.5', 'claude-3-haiku': 'Claude Haiku', 'claude-4-sonnet': 'Claude 4'
    };
    return names[model] || model;
  }

  getPlanSeverity(plan: PlanCard): 'success' | 'info' | 'warning' | 'danger' | 'secondary' {
    if (plan.isPopular) return 'warning';
    if (plan.price === 0) return 'secondary';
    if (plan.name.toLowerCase().includes('kurumsal')) return 'danger';
    return 'info';
  }

  get hasError(): boolean { return !!this.errorMessage; }
  get hasPlans(): boolean { return this.plans.length > 0; }
}

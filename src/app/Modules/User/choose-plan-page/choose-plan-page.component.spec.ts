import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChoosePlanPageComponent } from './choose-plan-page.component';

describe('ChoosePlanPageComponent', () => {
  let component: ChoosePlanPageComponent;
  let fixture: ComponentFixture<ChoosePlanPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChoosePlanPageComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ChoosePlanPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

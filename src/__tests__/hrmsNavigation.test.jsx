import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import Phase3Ops from '../Phase3Ops.jsx';

describe('HRMS Dedicated Sub-navigation and Views', () => {
  const mockAuthUser = {
    id: 'user-owner-1',
    email: 'owner@example.com',
    role: 'Owner'
  };

  const mockProfile = {
    businessId: 'biz-test-1',
    businessName: 'Trinetr Namkeen Corp',
    companyName: 'Trinetr Namkeen Corp',
    role: 'Owner'
  };

  const mockEmployees = [
    {
      id: 'emp-1',
      name: 'Ramesh Patel',
      role: 'Manager',
      department: 'Production',
      salary: 25000,
      salaryType: 'Monthly',
      status: 'Active',
      hireDate: '2025-01-01'
    },
    {
      id: 'emp-2',
      name: 'Suresh Kumar',
      role: 'Staff',
      department: 'Packaging',
      salary: 18000,
      salaryType: 'Monthly',
      status: 'Active',
      hireDate: '2025-02-01'
    }
  ];

  beforeEach(() => {
    localStorage.clear();
  });

  it('renders Directory by default or when hrmsSubTab="directory"', () => {
    render(
      <Phase3Ops
        activeTab="employees"
        hrmsSubTab="directory"
        authUser={mockAuthUser}
        profile={mockProfile}
        cloudEmployees={mockEmployees}
        cloudAttendance={[]}
      />
    );

    // Directory heading and cards should be visible
    expect(screen.getByRole('heading', { name: /Employee Directory/i })).toBeInTheDocument();
    expect(screen.getByText('Ramesh Patel')).toBeInTheDocument();

    // Attendance and Payroll headings should NOT be visible
    expect(screen.queryByRole('heading', { name: /^Attendance$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /Attendance Reports/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /Monthly Payroll & Payslips Register/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /Holiday Calendar/i })).not.toBeInTheDocument();
  });

  it('renders Daily Attendance view when hrmsSubTab="attendance"', () => {
    render(
      <Phase3Ops
        activeTab="employees"
        hrmsSubTab="attendance"
        authUser={mockAuthUser}
        profile={mockProfile}
        cloudEmployees={mockEmployees}
        cloudAttendance={[]}
      />
    );

    // Attendance forms & reports should be visible
    expect(screen.getByRole('heading', { name: /^Attendance$/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Attendance Reports/i })).toBeInTheDocument();

    // Directory list and Payroll sections should NOT be visible
    expect(screen.queryByRole('heading', { name: /Employee Directory/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /Monthly Payroll & Payslips Register/i })).not.toBeInTheDocument();
  });

  it('renders Monthly Payroll & Payslips Register when hrmsSubTab="payroll"', () => {
    render(
      <Phase3Ops
        activeTab="employees"
        hrmsSubTab="payroll"
        authUser={mockAuthUser}
        profile={mockProfile}
        cloudEmployees={mockEmployees}
        cloudAttendance={[]}
      />
    );

    // Payroll and Leave Management should be visible
    expect(screen.getByRole('heading', { name: /Monthly Payroll & Payslips Register/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Leave Management/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Holiday Calendar/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Leave Policies/i })).toBeInTheDocument();

    // Directory list and Attendance forms should NOT be visible
    expect(screen.queryByRole('heading', { name: /Employee Directory/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /^Attendance$/i })).not.toBeInTheDocument();
  });

  it('renders All Sections when subnav "View All Sections" is clicked', () => {
    const handleSubTabChange = vi.fn();
    render(
      <Phase3Ops
        activeTab="employees"
        hrmsSubTab="directory"
        onHrmsSubTabChange={handleSubTabChange}
        authUser={mockAuthUser}
        profile={mockProfile}
        cloudEmployees={mockEmployees}
        cloudAttendance={[]}
      />
    );

    // Click "View All Sections" tab pill
    const allTabBtn = screen.getByRole('button', { name: /View All Sections/i });
    fireEvent.click(allTabBtn);

    expect(handleSubTabChange).toHaveBeenCalledWith('all');

    // Both directory, attendance, and payroll are visible
    expect(screen.getByRole('heading', { name: /Employee Directory/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /^Attendance$/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Monthly Payroll & Payslips Register/i })).toBeInTheDocument();
  });
});

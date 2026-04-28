"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { AdminSection, Button, Chip, EmptyAdminState, EntitySelect, Input, Switch, Tab, Tabs, TextArea } from "@/components/admin-ui";
import { authClient } from "@/lib/auth-client";
import { queryClient, trpc } from "@/lib/trpc";

export function UsersAdminPage() {
  const { data: session } = authClient.useSession();
  const users = useQuery(trpc.adminUsers.list.queryOptions());
  const customers = useQuery(trpc.adminUsers.listCustomers.queryOptions());
  const wilayas = useQuery(trpc.locations.wilayas.queryOptions());
  const announcements = useQuery(trpc.notifications.adminListAnnouncements.queryOptions());
  const preferences = useQuery(trpc.notifications.adminListOrderNotificationPreferences.queryOptions());

  const [customerForm, setCustomerForm] = useState({ fullName: "", phoneNumber: "", password: "", wilayaId: "", communeId: "", streetAddress: "" });
  const communes = useQuery({ ...trpc.locations.communesByWilaya.queryOptions({ wilayaId: customerForm.wilayaId }), enabled: !!customerForm.wilayaId });
  const [adminForm, setAdminForm] = useState({ name: "", email: "", password: "" });
  const [phoneChange, setPhoneChange] = useState({ userId: "", phoneNumber: "" });
  const [announcementForm, setAnnouncementForm] = useState({ title: "", body: "", sendPush: false });

  const createCustomer = useMutation(trpc.adminUsers.createCustomer.mutationOptions({ onSuccess: () => queryClient.invalidateQueries() }));
  const createAdmin = useMutation(trpc.adminUsers.createAdmin.mutationOptions({ onSuccess: () => queryClient.invalidateQueries() }));
  const disableUser = useMutation(trpc.adminUsers.disableUser.mutationOptions({ onSuccess: () => queryClient.invalidateQueries() }));
  const updatePhone = useMutation(trpc.adminUsers.updateClientPhone.mutationOptions({ onSuccess: () => queryClient.invalidateQueries() }));
  const createAnnouncement = useMutation(trpc.notifications.adminCreateAnnouncement.mutationOptions({ onSuccess: () => queryClient.invalidateQueries() }));
  const updatePreference = useMutation(trpc.notifications.adminUpdateOrderNotificationPreference.mutationOptions({ onSuccess: () => queryClient.invalidateQueries() }));

  return (
    <main className="module-page">
      <section className="module-hero">
        <Chip color="primary" variant="flat">Accounts and messaging</Chip>
        <h2>Users, admins, announcements, and settings</h2>
        <p>Manage customers, admin accounts, announcements, and notification recipients without owner escalation.</p>
      </section>

      <Tabs aria-label="User admin sections" color="primary">
        <Tab key="customers" title="Customers">
          <div className="split-grid">
            <AdminSection title="Create customer">
              <Input label="Full name" value={customerForm.fullName} onValueChange={(fullName) => setCustomerForm({ ...customerForm, fullName })} />
              <Input label="Phone" value={customerForm.phoneNumber} onValueChange={(phoneNumber) => setCustomerForm({ ...customerForm, phoneNumber })} />
              <Input label="Password" type="password" value={customerForm.password} onValueChange={(password) => setCustomerForm({ ...customerForm, password })} />
              <EntitySelect label="Wilaya" value={customerForm.wilayaId} onChange={(wilayaId) => setCustomerForm({ ...customerForm, wilayaId, communeId: "" })} items={(wilayas.data ?? []).map((wilaya) => ({ id: wilaya.id, label: wilaya.nameFr }))} />
              <EntitySelect label="Commune" value={customerForm.communeId} onChange={(communeId) => setCustomerForm({ ...customerForm, communeId })} items={(communes.data ?? []).map((commune) => ({ id: commune.id, label: commune.nameFr }))} />
              <Input label="Street address" value={customerForm.streetAddress} onValueChange={(streetAddress) => setCustomerForm({ ...customerForm, streetAddress })} />
              <Button color="primary" isLoading={createCustomer.isPending} onPress={() => createCustomer.mutate(customerForm)}>Create customer</Button>
            </AdminSection>
            <AdminSection title="Customer phone change">
              <EntitySelect label="Customer" value={phoneChange.userId} onChange={(userId) => setPhoneChange({ ...phoneChange, userId })} items={(customers.data ?? []).map((customer) => ({ id: customer.id, label: `${customer.profileFullName ?? customer.name} · ${customer.phoneNumberLocal ?? "no phone"}` }))} />
              <Input label="New phone" value={phoneChange.phoneNumber} onValueChange={(phoneNumber) => setPhoneChange({ ...phoneChange, phoneNumber })} />
              <Button variant="flat" onPress={() => updatePhone.mutate(phoneChange)} isLoading={updatePhone.isPending}>Update phone</Button>
            </AdminSection>
          </div>

          <AdminSection title="Customers">
            <div className="admin-table">
              {(customers.data ?? []).map((customer) => (
                <div className="admin-row" key={customer.id}>
                  <div><strong>{customer.profileFullName ?? customer.name}</strong><p className="muted">{customer.phoneNumberLocal ?? customer.phoneNumber} · {customer.streetAddress ?? "No profile address"}</p></div>
                  <div className="row-actions">
                    {customer.isDisabled ? <Chip color="danger" variant="flat">Disabled</Chip> : null}
                    <Button size="sm" variant="flat" color="danger" isDisabled={customer.isDisabled} onPress={() => disableUser.mutate({ userId: customer.id })}>Disable</Button>
                  </div>
                </div>
              ))}
            </div>
          </AdminSection>
        </Tab>

        <Tab key="admins" title="Admins">
          <AdminSection title="Create admin account" description="Admins cannot create owners in V1.">
            <div className="form-grid">
              <Input label="Name" value={adminForm.name} onValueChange={(name) => setAdminForm({ ...adminForm, name })} />
              <Input label="Email" type="email" value={adminForm.email} onValueChange={(email) => setAdminForm({ ...adminForm, email })} />
              <Input label="Password" type="password" value={adminForm.password} onValueChange={(password) => setAdminForm({ ...adminForm, password })} />
            </div>
            <Button color="primary" isLoading={createAdmin.isPending} onPress={() => createAdmin.mutate(adminForm)}>Create admin</Button>
          </AdminSection>
          <AdminSection title="Admin accounts">
            <div className="admin-table">
              {(users.data ?? []).filter((user) => user.role === "admin" || user.role === "owner").map((user) => (
                <div className="admin-row" key={user.id}>
                  <div><strong>{user.name}</strong><p className="muted">{user.email} · {user.role}</p></div>
                  <div className="row-actions">
                    {user.isSeedOwner ? <Chip color="warning" variant="flat">Protected seed owner</Chip> : null}
                    {user.id === session?.user.id ? <Chip color="primary" variant="flat">You</Chip> : null}
                    <Button size="sm" color="danger" variant="flat" isDisabled={user.isSeedOwner || user.id === session?.user.id || user.isDisabled} onPress={() => disableUser.mutate({ userId: user.id })}>Disable</Button>
                  </div>
                </div>
              ))}
            </div>
          </AdminSection>
        </Tab>

        <Tab key="announcements" title="Announcements">
          <AdminSection title="Create announcement">
            <Input label="Title" value={announcementForm.title} onValueChange={(title) => setAnnouncementForm({ ...announcementForm, title })} />
            <TextArea label="Body" value={announcementForm.body} onValueChange={(body) => setAnnouncementForm({ ...announcementForm, body })} rows={4} />
            <Switch isSelected={announcementForm.sendPush} onValueChange={(sendPush) => setAnnouncementForm({ ...announcementForm, sendPush })}>Send push notification</Switch>
            <Button color="primary" isLoading={createAnnouncement.isPending} onPress={() => createAnnouncement.mutate(announcementForm)}>Publish announcement</Button>
          </AdminSection>
          <AdminSection title="Previous announcements">
            {(announcements.data ?? []).map((announcement) => <p key={announcement.id}><strong>{announcement.title}</strong> · push {announcement.sendPush ? "yes" : "no"}</p>)}
            {announcements.data?.length === 0 ? <EmptyAdminState label="No announcements yet." /> : null}
          </AdminSection>
        </Tab>

        <Tab key="settings" title="Settings">
          <AdminSection title="Order notification recipients" description="Production email and push behavior is logged in delivery logs.">
            <div className="admin-table">
              {(preferences.data ?? []).map((preference) => (
                <div className="admin-row" key={preference.userId}>
                  <div><strong>{preference.name}</strong><p className="muted">{preference.email} · {preference.role}</p></div>
                  <div className="row-actions">
                    <Switch isSelected={preference.receivesNewOrderEmail} onValueChange={(receivesNewOrderEmail) => updatePreference.mutate({ ...preference, receivesNewOrderEmail })}>Email</Switch>
                    <Switch isSelected={preference.receivesNewOrderPush} onValueChange={(receivesNewOrderPush) => updatePreference.mutate({ ...preference, receivesNewOrderPush })}>Push</Switch>
                  </div>
                </div>
              ))}
            </div>
          </AdminSection>
          <AdminSection title="Production settings placeholders">
            <p className="muted">Configure Resend sender, Cloudinary credentials, production backups, and hosting-specific environment variables before launch.</p>
          </AdminSection>
        </Tab>
      </Tabs>
    </main>
  );
}

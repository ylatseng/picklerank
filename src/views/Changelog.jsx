import React from 'react';
import { Sec } from '../components/Shared.jsx';

export default function Changelog({ theme }) {
  const z = theme.zoom || 1.0;
  return (
    <div style={{ padding: 10*z }}>
      <Sec title="APP CHANGELOG" theme={theme}>
        <div style={{ fontSize: 13*z, lineHeight: 1.6 }}>
          
          <div style={{ marginBottom: 20*z }}>
            <h3 style={{ margin: "0 0 5px 0", color: theme.accent }}>v1.1.5 - Event Management Upgrade</h3>
            <ul style={{ paddingLeft: 20*z }}>
              <li>Revamped "Create Session" UI for a more professional, modern workflow.</li>
              <li>Implemented a streamlined player dropdown selector for event invites.</li>
              <li>Added alphabetical sorting for the player invitation list.</li>
              <li>Events now display a list of invited players for quick reference.</li>
            </ul>
          </div>

          <div style={{ marginBottom: 20*z }}>
            <h3 style={{ margin: "0 0 5px 0", color: theme.accent }}>v1.1.4 - Security & Control</h3>
            <ul style={{ paddingLeft: 20*z }}>
              <li>Restricted event deletion to Administrator accounts only.</li>
              <li>Added mandatory confirmation prompts to prevent accidental deletions.</li>
              <li>Enabled editing functionality for existing event sessions.</li>
            </ul>
          </div>

          <div style={{ marginBottom: 20*z }}>
            <h3 style={{ margin: "0 0 5px 0", color: theme.accent }}>v1.1.3 - Event Scheduling</h3>
            <ul style={{ paddingLeft: 20*z }}>
              <li>Introduced the "Events" tab to organize upcoming pickleball sessions.</li>
              <li>Added quick-share functionality (Web Share API) to notify players via messaging apps.</li>
            </ul>
          </div>

          <div style={{ marginBottom: 20*z }}>
            <h3 style={{ margin: "0 0 5px 0", color: theme.accent }}>v1.1.2 and earlier</h3>
            <ul style={{ paddingLeft: 20*z }}>
              <li>Refined ranking algorithms and UI responsiveness.</li>
              <li>Optimized local database state management.</li>
              <li>Implemented PWA support for mobile device installation.</li>
            </ul>
          </div>

        </div>
      </Sec>
    </div>
  );
}
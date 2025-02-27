import type { UserResource } from '@clerk/types';
import { describe, it } from '@jest/globals';

import { bindCreateFixtures, fireEvent, render, screen, waitFor } from '../../../../testUtils';
import { PasswordPage } from '../PasswordPage';

const { createFixtures } = bindCreateFixtures('UserProfile');

const initConfig = createFixtures.config(f => {
  f.withUser({});
});

const changePasswordConfig = createFixtures.config(f => {
  f.withUser({ password_enabled: true });
});

describe('PasswordPage', () => {
  it('renders the component', async () => {
    const { wrapper } = await createFixtures(initConfig);

    render(<PasswordPage />, { wrapper });
  });

  it('shows the title', async () => {
    const { wrapper } = await createFixtures(initConfig);

    render(<PasswordPage />, { wrapper });

    screen.getByRole('heading', { name: /Set password/i });
    expect(screen.queryByRole(/current password/i)).not.toBeInTheDocument();
  });

  it('shows setup of changing password', async () => {
    const { wrapper } = await createFixtures(changePasswordConfig);

    render(<PasswordPage />, { wrapper });

    screen.getByRole('heading', { name: /change password/i });
    screen.getByLabelText(/current password/i);
  });

  describe('Actions', () => {
    it('calls the appropriate function upon pressing continue and finish', async () => {
      const { wrapper, fixtures } = await createFixtures(initConfig);

      fixtures.clerk.user?.update.mockResolvedValue({} as UserResource);
      const { userEvent } = render(<PasswordPage />, { wrapper });

      await userEvent.type(screen.getByLabelText(/new password/i), 'testtest');
      await userEvent.type(screen.getByLabelText(/confirm password/i), 'testtest');
      await userEvent.click(screen.getByRole('button', { name: /continue/i }));
      expect(fixtures.clerk.user?.updatePassword).toHaveBeenCalledWith({
        newPassword: 'testtest',
        signOutOfOtherSessions: false,
      });

      expect(await screen.findByText(/has been set/i));
      await userEvent.click(screen.getByRole('button', { name: /finish/i }));
      expect(fixtures.router.navigate).toHaveBeenCalledWith('/');
    });

    it('updates passwords and signs out of other sessions', async () => {
      const { wrapper, fixtures } = await createFixtures(initConfig);

      fixtures.clerk.user?.update.mockResolvedValue({} as UserResource);
      const { userEvent } = render(<PasswordPage />, { wrapper });

      await userEvent.type(screen.getByLabelText(/new password/i), 'testtest');
      await userEvent.type(screen.getByLabelText(/confirm password/i), 'testtest');
      await userEvent.click(screen.getByRole('checkbox', { name: /sign out of all other devices/i }));
      await userEvent.click(screen.getByRole('button', { name: /continue/i }));
      expect(fixtures.clerk.user?.updatePassword).toHaveBeenCalledWith({
        newPassword: 'testtest',
        signOutOfOtherSessions: true,
      });

      expect(await screen.findByText(/signed out/i));
    });

    it('results in error if the password is too small', async () => {
      const { wrapper } = await createFixtures(initConfig);

      const { userEvent } = render(<PasswordPage />, { wrapper });

      await userEvent.type(screen.getByLabelText(/new password/i), 'test');
      const confirmField = screen.getByLabelText(/confirm password/i);
      await userEvent.type(confirmField, 'test');
      fireEvent.blur(confirmField);
      await waitFor(() => {
        screen.getByText(/or more/i);
      });
    });

    it('results in error if the passwords do not match and persists', async () => {
      const { wrapper } = await createFixtures(initConfig);

      const { userEvent } = render(<PasswordPage />, { wrapper });

      await userEvent.type(screen.getByLabelText(/new password/i), 'testewrewr');
      const confirmField = screen.getByLabelText(/confirm password/i);
      await userEvent.type(confirmField, 'testrwerrwqrwe');
      fireEvent.blur(confirmField);
      await waitFor(() => {
        screen.getByText(`Passwords don't match.`);
      });

      await userEvent.clear(confirmField);
      await waitFor(() => {
        screen.getByText(`Passwords don't match.`);
      });
    });

    it(`Displays "Password match" when password match and removes it if they stop`, async () => {
      const { wrapper } = await createFixtures(initConfig);

      const { userEvent } = render(<PasswordPage />, { wrapper });

      const passwordField = screen.getByLabelText(/new password/i);
      await userEvent.type(passwordField, 'testewrewr');
      const confirmField = screen.getByLabelText(/confirm password/i);
      expect(screen.queryByText(`Passwords match.`)).not.toBeInTheDocument();
      await userEvent.type(confirmField, 'testewrewr');
      await waitFor(() => {
        screen.getByText(`Passwords match.`);
      });

      await userEvent.type(confirmField, 'testrwerrwqrwe');
      await waitFor(() => {
        expect(screen.queryByText(`Passwords match.`)).not.toBeInTheDocument();
      });

      await userEvent.type(passwordField, 'testrwerrwqrwe');
      fireEvent.blur(confirmField);
      await waitFor(() => {
        screen.getByText(`Passwords match.`);
      });
    }, 10000);

    it('navigates to the root page upon pressing cancel', async () => {
      const { wrapper, fixtures } = await createFixtures(initConfig);

      const { userEvent } = render(<PasswordPage />, { wrapper });

      await userEvent.click(screen.getByRole('button', { name: /cancel/i }));
      expect(fixtures.router.navigate).toHaveBeenCalledWith('/');
    });
  });
});

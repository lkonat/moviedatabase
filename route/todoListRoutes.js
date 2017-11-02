app.route('/auth/forgot_password')
  .get(userHandlers.render_forgot_password_template)
  .post(userHandlers.forgot_password);

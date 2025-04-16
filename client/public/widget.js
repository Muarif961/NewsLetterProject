async function submitForm(formData, userId, groupId) {
  try {
    const response = await fetch(`/api/forms/submit/${userId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ...formData,
        groupId
      })
    });

    if (!response.ok) {
      throw new Error('Form submission failed');
    }

    return { success: true };
  } catch (error) {
    console.error('Form submission error:', error);
    return { success: false, error: error.message };
  }
}

const defaultContent = {
    title: "Subscribe to our Newsletter",
    description: "Stay updated with our latest content",
    buttonText: "Subscribe",
    emailLabel: "Email Address",
    emailPlaceholder: "your@email.com",
    nameLabel: "Name",
    namePlaceholder: "John Doe",
    showNameField: true,
    successMessage: "Thanks for subscribing!",
    errorMessage: "Something went wrong. Please try again."
  };

function init({ userId, containerId, isPopup = false, popupTrigger = 'button', popupDelay = 5, popupScrollPercent = 50, styles = {}, content = {}, groups = [] }) {
  const container = document.getElementById(containerId);
  if (!container && !window.location.pathname.startsWith('/subscribe/')) return;

  // Fetch the latest styles from the server for direct popup URL
  async function fetchLatestStyles(userId) {
    try {
      // Get the correct API URL based on the current origin
      const currentOrigin = window.location.origin;
      let baseUrl = currentOrigin;

      // If we're on port 5174 (development frontend), switch to backend port 3000
      if (currentOrigin.includes(':5174')) {
        baseUrl = currentOrigin.replace(':5174', ':3000');
      }
      // If we're already on port 3000, use that
      else if (currentOrigin.includes(':3000')) {
        baseUrl = currentOrigin;
      }

      console.log('Current origin:', currentOrigin);
      console.log('Using base URL for API:', baseUrl);

      const apiUrl = `${baseUrl}/api/forms/${userId}/styles`;
      console.log('Fetching styles from:', apiUrl);

      const response = await fetch(apiUrl);
      if (!response.ok) {
        console.error('Failed to fetch styles:', response.statusText);
        throw new Error('Failed to fetch styles');
      }

      const data = await response.json();
      console.log('Successfully fetched styles:', data);

      if (!data.styles || !data.content) {
        console.warn('Received incomplete style data, using defaults');
        return {
          styles: defaultStyles,
          content: defaultContent
        };
      }

      return {
        styles: { ...defaultStyles, ...data.styles },
        content: { ...defaultContent, ...data.content }
      };
    } catch (error) {
      console.error('Error fetching form styles:', error);
      return { 
        styles: defaultStyles, 
        content: defaultContent 
      };
    }
  }

  const defaultStyles = {
    backgroundColor: "white",
    textColor: "#000000",
    borderColor: "#e2e8f0",
    borderRadius: 8,
    fontFamily: "Arial",
    fontSize: "16px",
    buttonBackgroundColor: "#6366f1",
    buttonTextColor: "#ffffff",
    titleColor: "#000000",
    descriptionColor: "#64748b",
    formMaxWidth: 400,
    formPadding: 24,
    formBackgroundOpacity: 100,
    formShadow: 'medium'
  };


  // Initialize with default values
  let finalStyles = { ...defaultStyles };
  let finalContent = { ...defaultContent };

  const getBackgroundWithOpacity = (hexColor) => {
    if (!hexColor || hexColor.startsWith('rgba')) {
      return hexColor;
    }
    try {
      const r = parseInt(hexColor.slice(1, 3), 16);
      const g = parseInt(hexColor.slice(3, 5), 16);
      const b = parseInt(hexColor.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, ${finalStyles.formBackgroundOpacity / 100})`;
    } catch (e) {
      console.error('Error parsing color:', e);
      return hexColor;
    }
  };

  const getShadowStyle = (shadowSize) => {
    switch (shadowSize) {
      case 'small': return '0 2px 4px rgba(0,0,0,0.1)';
      case 'medium': return '0 4px 6px rgba(0,0,0,0.1)';
      case 'large': return '0 10px 15px rgba(0,0,0,0.1)';
      default: return 'none';
    }
  };

  // Handle direct URL access
  if (window.location.pathname.startsWith('/subscribe/')) {
    const pathUserId = window.location.pathname.split('/')[2];
    if (pathUserId) {
      // Fetch latest styles when accessed via direct URL
      fetchLatestStyles(pathUserId).then(({ styles: latestStyles, content: latestContent }) => {
        // Merge with defaults, giving priority to fetched styles
        finalStyles = { ...defaultStyles, ...latestStyles };
        finalContent = { ...defaultContent, ...latestContent };

        // Create container if none exists
        if (!container) {
          const formContainer = document.createElement('div');
          formContainer.id = 'newsletter-widget-container';
          document.body.appendChild(formContainer);
        }

        // Create and show popup immediately
        const overlay = document.createElement('div');
        overlay.style.cssText = `
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 9999;
        `;
        document.body.appendChild(overlay);

        // Create form container with updated styles
        const formContainer = document.createElement('div');
        formContainer.style.cssText = `
          position: relative;
          max-width: ${finalStyles.formMaxWidth}px;
          width: 90%;
          margin: 20px;
          padding: ${finalStyles.formPadding}px;
          background: ${getBackgroundWithOpacity(finalStyles.backgroundColor)};
          border: 1px solid ${finalStyles.borderColor};
          border-radius: ${finalStyles.borderRadius}px;
          box-shadow: ${getShadowStyle(finalStyles.formShadow)};
          font-family: ${finalStyles.fontFamily};
          font-size: ${finalStyles.fontSize};
        `;
        overlay.appendChild(formContainer);

        // Add close button with consistent styling
        const closeButton = document.createElement('button');
        closeButton.innerHTML = '×';
        closeButton.style.cssText = `
          position: absolute;
          top: 10px;
          right: 10px;
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: ${finalStyles.textColor};
          font-family: ${finalStyles.fontFamily};
        `;
        closeButton.onclick = () => {
          overlay.remove();
          window.history.back();
        };
        formContainer.appendChild(closeButton);

        // Generate form content with consistent styling
        formContainer.innerHTML += `
          <div style="text-align: center; margin-bottom: 1.5rem;">
            <h3 style="
              margin: 0 0 0.5rem;
              font-size: 1.25rem;
              font-weight: 600;
              color: ${finalStyles.titleColor};
              font-family: ${finalStyles.fontFamily};
            ">
              ${finalContent.title}
            </h3>
            <p style="
              margin: 0;
              color: ${finalStyles.descriptionColor};
              font-size: 0.875rem;
              font-family: ${finalStyles.fontFamily};
            ">
              ${finalContent.description}
            </p>
          </div>
          <form id="popup-newsletter-form" style="
            display: flex;
            flex-direction: column;
            gap: 1rem;
            font-family: ${finalStyles.fontFamily};
          ">
            <div style="display: flex; flex-direction: column; gap: 0.5rem;">
              <label style="
                color: ${finalStyles.textColor};
                font-size: 0.875rem;
                font-family: ${finalStyles.fontFamily};
              ">
                ${finalContent.emailLabel}
              </label>
              <input
                type="email"
                required
                placeholder="${finalContent.emailPlaceholder}"
                style="
                  width: 100%;
                  padding: 0.75rem;
                  border: 1px solid ${finalStyles.borderColor};
                  border-radius: ${finalStyles.borderRadius}px;
                  color: ${finalStyles.textColor};
                  background: ${getBackgroundWithOpacity(finalStyles.backgroundColor)};
                  font-family: ${finalStyles.fontFamily};
                  font-size: ${finalStyles.fontSize};
                "
              />
            </div>
            ${finalContent.showNameField ? `
              <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                <label style="
                  color: ${finalStyles.textColor};
                  font-size: 0.875rem;
                  font-family: ${finalStyles.fontFamily};
                ">
                  ${finalContent.nameLabel}
                </label>
                <input
                  type="text"
                  placeholder="${finalContent.namePlaceholder}"
                  style="
                    width: 100%;
                    padding: 0.75rem;
                    border: 1px solid ${finalStyles.borderColor};
                    border-radius: ${finalStyles.borderRadius}px;
                    color: ${finalStyles.textColor};
                    background: ${getBackgroundWithOpacity(finalStyles.backgroundColor)};
                    font-family: ${finalStyles.fontFamily};
                    font-size: ${finalStyles.fontSize};
                  "
                />
              </div>
            ` : ''}
            <select id="groupSelect" style="
              width: 100%;
              padding: 0.75rem;
              border: 1px solid ${finalStyles.borderColor};
              border-radius: ${finalStyles.borderRadius}px;
              color: ${finalStyles.textColor};
              background: ${getBackgroundWithOpacity(finalStyles.backgroundColor)};
              font-family: ${finalStyles.fontFamily};
              font-size: ${finalStyles.fontSize};
            ">
              <option value="">Select Group</option>
              ${groups.map(group => `<option value="${group.id}">${group.name}</option>`).join('')}
            </select>
            <button
              type="submit"
              style="
                width: 100%;
                background: ${finalStyles.buttonBackgroundColor};
                color: ${finalStyles.buttonTextColor};
                padding: 0.75rem;
                border: none;
                border-radius: ${finalStyles.borderRadius}px;
                font-weight: 500;
                cursor: pointer;
                font-family: ${finalStyles.fontFamily};
                font-size: ${finalStyles.fontSize};
                margin-top: 0.5rem;
              "
            >
              ${finalContent.buttonText}
            </button>
          </form>
          <div id="popup-form-message" style="
            text-align: center;
            margin-top: 1rem;
            font-family: ${finalStyles.fontFamily};
            font-size: 0.875rem;
            display: none;
          ">
            <p class="success" style="color: #22c55e; display: none;">${finalContent.successMessage}</p>
            <p class="error" style="color: #ef4444; display: none;">${finalContent.errorMessage}</p>
          </div>
        `;

        // Add form submission handler
        const form = document.getElementById('popup-newsletter-form');
        const messageDiv = document.getElementById('popup-form-message');
        form.onsubmit = async function(e) {
          e.preventDefault();
          const formData = new FormData(form);
          const groupId = document.getElementById('groupSelect').value; //Get group ID from select
          const submitButton = form.querySelector('button[type="submit"]');
          submitButton.disabled = true;
          submitButton.textContent = 'Subscribing...';

          try {
            const result = await submitForm(Object.fromEntries(formData), pathUserId, groupId);
            if (result.success) {
              messageDiv.style.display = 'block';
              messageDiv.querySelector('.success').style.display = 'block';
              form.reset();
              setTimeout(() => {
                overlay.remove();
                window.history.back();
              }, 2000);
            } else {
              throw new Error(result.error);
            }
          } catch (error) {
            console.error('Subscription error:', error);
            messageDiv.style.display = 'block';
            messageDiv.querySelector('.error').style.display = 'block';
            messageDiv.querySelector('.error').textContent = error.message;
            submitButton.disabled = false;
            submitButton.textContent = finalContent.buttonText;
          }
        };

      }).catch(error => {
        console.error('Failed to fetch form styles:', error);
        // Continue with default styles if fetch fails
        createPopupForm();
      });
      return;
    }
  }

  // Regular embed code logic for non-popup version
  container.innerHTML = `
    <div id="newsletter-widget" style="
      font-family: ${finalStyles.fontFamily};
      max-width: ${finalStyles.formMaxWidth}px;
      margin: 1rem auto;
      padding: ${finalStyles.formPadding}px;
      border: 1px solid ${finalStyles.borderColor};
      border-radius: ${finalStyles.borderRadius}px;
      background: ${getBackgroundWithOpacity(finalStyles.backgroundColor)};
      box-shadow: ${getShadowStyle(finalStyles.formShadow)};
    ">
      <form id="newsletter-form" style="display: flex; flex-direction: column; gap: 1rem;">
        <div style="text-align: center;">
          <h3 style="margin: 0 0 0.5rem; font-size: 1.25rem; font-weight: 600; color: ${finalStyles.titleColor}">
            ${finalContent.title}
          </h3>
          <p style="margin: 0; color: ${finalStyles.descriptionColor}; font-size: 0.875rem;">
            ${finalContent.description}
          </p>
        </div>
        <div style="display: flex; flex-direction: column; gap: 0.5rem;">
          <label style="color: ${finalStyles.textColor}; font-size: 0.875rem;">
            ${finalContent.emailLabel}
          </label>
          <input
            type="email"
            required
            placeholder="${finalContent.emailPlaceholder}"
            style="
              width: 100%;
              padding: 0.5rem;
              border: 1px solid ${finalStyles.borderColor};
              border-radius: ${finalStyles.borderRadius}px;
              color: ${finalStyles.textColor};
              background: ${getBackgroundWithOpacity(finalStyles.backgroundColor)};
            "
          />
        </div>
        ${finalContent.showNameField ? `
          <div style="display: flex; flex-direction: column; gap: 0.5rem;">
            <label style="color: ${finalStyles.textColor}; font-size: 0.875rem;">
              ${finalContent.nameLabel}
            </label>
            <input
              type="text"
              placeholder="${finalContent.namePlaceholder}"
              style="
                width: 100%;
                padding: 0.5rem;
                border: 1px solid ${finalStyles.borderColor};
                border-radius: ${finalStyles.borderRadius}px;
                color: ${finalStyles.textColor};
                background: ${getBackgroundWithOpacity(finalStyles.backgroundColor)};
              "
            />
          </div>
        ` : ''}
        <select id="groupSelect" style="
              width: 100%;
              padding: 0.75rem;
              border: 1px solid ${finalStyles.borderColor};
              border-radius: ${finalStyles.borderRadius}px;
              color: ${finalStyles.textColor};
              background: ${getBackgroundWithOpacity(finalStyles.backgroundColor)};
              font-family: ${finalStyles.fontFamily};
              font-size: ${finalStyles.fontSize};
            ">
              <option value="">Select Group</option>
              ${groups.map(group => `<option value="${group.id}">${group.name}</option>`).join('')}
            </select>
        <button
          type="submit"
          style="
            background: ${finalStyles.buttonBackgroundColor};
            color: ${finalStyles.buttonTextColor};
            padding: 0.5rem 1rem;
            border: none;
            border-radius: ${finalStyles.borderRadius}px;
            font-weight: 500;
            cursor: pointer;
          "
        >
          ${finalContent.buttonText}
        </button>
      </form>
    </div>
  `;
}

function createPopupForm() {
  console.log("Creating popup form with default styles");
  // Use the default styles and content
  const defaultStyles = {
    backgroundColor: "white",
    textColor: "#000000",
    borderColor: "#e2e8f0",
    borderRadius: 8,
    fontFamily: "Arial",
    fontSize: "16px",
    buttonBackgroundColor: "#6366f1",
    buttonTextColor: "#ffffff",
    titleColor: "#000000",
    descriptionColor: "#64748b",
    formMaxWidth: 400,
    formPadding: 24,
    formBackgroundOpacity: 100,
    formShadow: 'medium'
  };

  const defaultContent = {
    title: "Subscribe to our Newsletter",
    description: "Stay updated with our latest content",
    buttonText: "Subscribe",
    emailLabel: "Email Address",
    emailPlaceholder: "your@email.com",
    nameLabel: "Name",
    namePlaceholder: "John Doe",
    showNameField: true,
    successMessage: "Thanks for subscribing!",
    errorMessage: "Something went wrong. Please try again."
  };

  init({ 
    userId: window.location.pathname.split('/')[2],
    containerId: 'newsletter-widget-container',
    styles: defaultStyles,
    content: defaultContent
  });
}
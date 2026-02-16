export function getMailboxItem(): Office.MessageRead | null {
  try {
    if (typeof Office === "undefined") return null;
    return (Office.context.mailbox?.item as Office.MessageRead) || null;
  } catch {
    return null;
  }
}

export function getItemSubject(): Promise<string> {
  return new Promise((resolve) => {
    const item = getMailboxItem();
    if (!item) return resolve("");
    try {
      // In read mode, subject is a string property
      const subject = item.subject as unknown;
      if (typeof subject === "string") {
        resolve(subject);
      } else {
        resolve("");
      }
    } catch {
      resolve("");
    }
  });
}

export function getItemBody(): Promise<string> {
  return new Promise((resolve) => {
    const item = getMailboxItem();
    if (!item) return resolve("");
    item.body.getAsync(Office.CoercionType.Html, (result) => {
      if (result.status === Office.AsyncResultStatus.Succeeded) {
        resolve(result.value || "");
      } else {
        resolve("");
      }
    });
  });
}

export function getSenderEmail(): Promise<string> {
  return new Promise((resolve) => {
    const item = getMailboxItem();
    if (!item) return resolve("");
    try {
      const from = item.from;
      if (from && from.emailAddress) {
        resolve(from.emailAddress);
      } else {
        resolve("");
      }
    } catch {
      resolve("");
    }
  });
}

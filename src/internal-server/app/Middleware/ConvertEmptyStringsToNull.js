/**
 * Converts empty string values in the request body to null.
 */
class ConvertEmptyStringsToNull {
  async handle({ request }, next) {
    const body = request.body();

    if (body && Object.keys(body).length > 0) {
      request.updateBody(
        Object.fromEntries(
          Object.entries(body).map(([key, value]) => [
            key,
            value === '' ? null : value,
          ]),
        ),
      );
    }

    await next();
  }
}

module.exports = ConvertEmptyStringsToNull;
